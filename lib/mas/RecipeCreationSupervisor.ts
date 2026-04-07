import { Supervisor } from './core/Supervisor';
import { LLMConnector } from './core/LLMConnector';
import { RecipeDraftingAgent } from './agents/RecipeDraftingAgent';
import { RecipeFinalizerAgent } from './agents/RecipeFinalizerAgent';
import type { AgentRequest, AgentResponse } from './types/mas';
import { AgentState } from './types/mas';
import type {
  DraftingAgentPayload,
  DraftingAgentOutput,
  FinalizerAgentPayload,
  RecipeCreationSession,
  CreateFromTextResponse,
  WorkingDraft,
  ConversationTurn,
} from './types/recipeCreation';
import {
  draftingAgentOutputSchema,
  finalizerAgentOutputSchema,
} from './types/recipeCreation';
import { MASError } from './types/exceptions';
import { sanitizePromptInjection } from '@/lib/utils/sanitizePromptInjection';
import { getRecipeService } from '@/lib/services/recipeService';
import { RecipeCreationSessionRepository } from '@/lib/services/recipeCreationSessionRepository';
import { getPrisma } from '@/lib/db/prisma';
import { Logger } from '@/lib/infra/Logger';
import { getDictionary } from '@/app/[lang]/dictionaries';

const MAX_ITERATIONS = 3;
const CONFIDENCE_THRESHOLD = 0.7;

export class RecipeCreationSupervisor extends Supervisor {
  private readonly sessionRepo: RecipeCreationSessionRepository;

  constructor() {
    super('RecipeCreationSupervisor');
    const llmConnector = LLMConnector.getInstance();
    this.registerAgent(new RecipeDraftingAgent(llmConnector));
    this.registerAgent(new RecipeFinalizerAgent(llmConnector));
    this.sessionRepo = new RecipeCreationSessionRepository(getPrisma());
  }

  /**
   * Process one conversational turn: message → [draft | questions | recipe created]
   */
  public async processTurn(
    message: string,
    sessionId: string | undefined,
    appLanguage: string,
  ): Promise<CreateFromTextResponse> {
    return this.orchestrate(
      'recipeCreationTurn',
      { message, sessionId, appLanguage },
      async (correlationId) => {
        const logger = Logger.getInstance();
        const dict = await getDictionary(appLanguage);
        const labels = dict.recipeCreationSupervisor;

        // ----- Fetch or initialize session -----
        let session: RecipeCreationSession | null = null;
        if (sessionId) {
          session = await this.sessionRepo.findById(sessionId);
          if (!session) {
            logger.log({
              timestamp: '',
              level: 'warn',
              message: `[${this.name}] Session ${sessionId} not found — starting fresh`,
              correlationId,
            });
          }
        }

        // ----- Sanitize input (Layer 1) -----
        const sanitized = sanitizePromptInjection(message, correlationId);
        if (!sanitized) {
          return this.buildRejectedResponse(session, labels.messageBlocked);
        }

        // ----- Enforce iteration cap -----
        const currentIterations = session?.iterationCount ?? 0;
        if (currentIterations >= MAX_ITERATIONS) {
          if (session) {
            await this.sessionRepo.update(session.id, { status: 'abandoned' });
          }
          return {
            status: 'rejected',
            messages: [labels.maxRoundsReached],
          };
        }

        // ----- Call DraftingAgent -----
        const draftingAgent = this.getAgent('RecipeDraftingAgent');
        if (!draftingAgent) throw new MASError('RecipeDraftingAgent is not registered');
        const draftingPayload: DraftingAgentPayload = {
          message: sanitized,
          currentDraft: session?.workingDraft ?? {},
          previousQuestions: session?.lastQuestions ?? [],
          conversationHistory: session?.conversationHistory ?? [],
          iterationCount: currentIterations,
          appLanguage,
          sourceLanguage: session?.sourceLanguage ?? null,
        };

        const draftingRequest: AgentRequest = {
          id: crypto.randomUUID(),
          from: this.name,
          to: draftingAgent.name,
          payload: { data: draftingPayload, meta: { correlationId } },
          state: AgentState.IDLE,
          timestamp: new Date(),
        };

        const draftingResponse: AgentResponse = await draftingAgent.process(draftingRequest);
        const draftingOutput = draftingAgentOutputSchema.parse(draftingResponse.payload.data);

        // ----- Branch on action -----
        if (draftingOutput.action === 'reject' || draftingOutput.safetyFlags.length > 0) {
          return this.buildRejectedResponse(
            session,
            draftingOutput.reason ?? labels.notARecipe,
          );
        }

        if (draftingOutput.action === 'ask_followup') {
          // Persist / update session
          const updatedSession = await this.upsertSession(
            session,
            draftingOutput,
            sanitized,
            appLanguage,
          );
          return {
            status: 'asking_followup',
            sessionId: updatedSession.id,
            messages: draftingOutput.questions,
          };
        }

        // action === 'create_recipe' — call finalizer
        const finalizerAgent = this.getAgent('RecipeFinalizerAgent');
        if (!finalizerAgent) throw new MASError('RecipeFinalizerAgent is not registered');
        const finalizerPayload: FinalizerAgentPayload = {
          draft: draftingOutput.draft,
          sourceLanguage: draftingOutput.sourceLanguage,
          appLanguage,
        };

        const finalizerRequest: AgentRequest = {
          id: crypto.randomUUID(),
          from: this.name,
          to: finalizerAgent.name,
          payload: { data: finalizerPayload, meta: { correlationId } },
          state: AgentState.IDLE,
          timestamp: new Date(),
        };

        const finalizerResponse: AgentResponse = await finalizerAgent.process(finalizerRequest);
        const finalizerOutput = finalizerAgentOutputSchema.parse(finalizerResponse.payload.data);

        // ----- Save guard -----
        const { recipe } = finalizerOutput;
        const isValid =
          recipe.title &&
          recipe.ingredients.length > 0 &&
          recipe.instructionSteps.length > 0 &&
          finalizerOutput.confidence >= CONFIDENCE_THRESHOLD;

        if (!isValid) {
          logger.log({
            timestamp: '',
            level: 'warn',
            message: `[${this.name}] Finalizer output failed save guard — falling back to ask_followup`,
            correlationId,
            data: { confidence: finalizerOutput.confidence, title: recipe.title },
          });
          const updatedSession = await this.upsertSession(
            session,
            draftingOutput,
            sanitized,
            appLanguage,
          );
          return {
            status: 'asking_followup',
            sessionId: updatedSession.id,
            messages:
              draftingOutput.questions.length > 0
                ? draftingOutput.questions
                : [labels.needMoreInfo],
          };
        }

        // ----- Persist final recipe -----
        const recipeService = getRecipeService();
        const persistedRecipe = await recipeService.createRecipe(
          {
            language: recipe.language,
            title: recipe.title,
            description: recipe.description,
            servings: recipe.servings,
            prepTime: recipe.prepTime,
            cookTime: recipe.cookTime,
            author: recipe.author,
            ingredients: recipe.ingredients,
            instructionSteps: recipe.instructionSteps,
          },
          recipe.originalUrl ?? '',
        );

        // ----- Delete session on success -----
        if (session) {
          await this.sessionRepo.delete(session.id);
        }

        logger.log({
          timestamp: '',
          level: 'info',
          message: `[${this.name}] Recipe created successfully`,
          correlationId,
          data: { recipeId: persistedRecipe.id, title: recipe.title },
        });

        return {
          status: 'recipe_created',
          recipeId: persistedRecipe.id,
          messages: [labels.recipeCreated.replace('{title}', recipe.title)],
        };
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async upsertSession(
    existing: RecipeCreationSession | null,
    draftingOutput: DraftingAgentOutput,
    message: string,
    appLanguage: string,
  ): Promise<RecipeCreationSession> {
    const merged: WorkingDraft = {
      ...existing?.workingDraft,
      ...draftingOutput.draft,
    };

    // Preserve existing arrays if drafting returned empty ones (partial answer)
    if (
      (!draftingOutput.draft.ingredients || draftingOutput.draft.ingredients.length === 0) &&
      existing?.workingDraft.ingredients?.length
    ) {
      merged.ingredients = existing.workingDraft.ingredients;
    }
    if (
      (!draftingOutput.draft.instructionSteps || draftingOutput.draft.instructionSteps.length === 0) &&
      existing?.workingDraft.instructionSteps?.length
    ) {
      merged.instructionSteps = existing.workingDraft.instructionSteps;
    }

    // Append user message + assistant questions to conversation history
    const prevHistory: ConversationTurn[] = existing?.conversationHistory ?? [];
    const updatedHistory: ConversationTurn[] = [
      ...prevHistory,
      { role: 'user', content: message },
      ...(draftingOutput.questions.length > 0
        ? [{ role: 'assistant' as const, content: draftingOutput.questions.join('\n') }]
        : []),
    ];

    if (existing) {
      await this.sessionRepo.update(existing.id, {
        iterationCount: existing.iterationCount + 1,
        workingDraft: merged,
        missingFields: draftingOutput.missingFields,
        lastQuestions: draftingOutput.questions,
        lastUserMessage: message,
        conversationHistory: updatedHistory,
        sourceLanguage: draftingOutput.sourceLanguage,
        confidence: draftingOutput.confidence,
      });
      return {
        ...existing,
        workingDraft: merged,
        iterationCount: existing.iterationCount + 1,
        conversationHistory: updatedHistory,
      };
    }

    return this.sessionRepo.create({ appLanguage, lastUserMessage: message }).then(async (s) => {
      await this.sessionRepo.update(s.id, {
        iterationCount: 1,
        workingDraft: merged,
        missingFields: draftingOutput.missingFields,
        lastQuestions: draftingOutput.questions,
        conversationHistory: updatedHistory,
        sourceLanguage: draftingOutput.sourceLanguage,
        confidence: draftingOutput.confidence,
      });
      return { ...s, workingDraft: merged, iterationCount: 1, conversationHistory: updatedHistory };
    });
  }

  private buildRejectedResponse(
    _session: RecipeCreationSession | null,
    message: string,
  ): CreateFromTextResponse {
    return { status: 'rejected', messages: [message] };
  }
}
