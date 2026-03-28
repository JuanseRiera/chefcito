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
  FinalizerAgentOutput,
  RecipeCreationSession,
  CreateFromTextResponse,
  WorkingDraft,
} from './types/recipeCreation';
import { sanitizePromptInjection } from '@/lib/utils/sanitizePromptInjection';
import { getRecipeService } from '@/lib/services/recipeService';
import { RecipeCreationSessionRepository } from '@/lib/services/recipeCreationSessionRepository';
import { getPrisma } from '@/lib/db/prisma';
import { Logger } from '@/lib/infra/Logger';

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
          return this.buildRejectedResponse(
            session,
            'Your message was blocked for security reasons. Please enter a recipe description.',
          );
        }

        // ----- Enforce iteration cap -----
        const currentIterations = session?.iterationCount ?? 0;
        if (currentIterations >= MAX_ITERATIONS) {
          if (session) {
            await this.sessionRepo.update(session.id, { status: 'abandoned' });
          }
          return {
            status: 'rejected',
            messages: [
              appLanguage === 'es'
                ? 'Se alcanzó el límite de preguntas. Por favor, escribí una descripción más completa de tu receta con título, ingredientes y pasos.'
                : 'Maximum clarification rounds reached. Please start over with a fuller recipe description that includes a title, ingredients, and steps.',
            ],
          };
        }

        // ----- Call DraftingAgent -----
        const draftingAgent = this.getAgent('RecipeDraftingAgent')!;
        const draftingPayload: DraftingAgentPayload = {
          message: sanitized,
          currentDraft: session?.workingDraft ?? {},
          previousQuestions: session?.lastQuestions ?? [],
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
        const draftingOutput = draftingResponse.payload.data as DraftingAgentOutput;

        // ----- Branch on action -----
        if (draftingOutput.action === 'reject' || draftingOutput.safetyFlags.length > 0) {
          return this.buildRejectedResponse(
            session,
            draftingOutput.reason ??
              (appLanguage === 'es'
                ? 'No pude entender tu mensaje como una receta. Por favor, intentá de nuevo con una descripción de receta válida.'
                : "I couldn't understand your message as a recipe. Please try again with a valid recipe description."),
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
        const finalizerAgent = this.getAgent('RecipeFinalizerAgent')!;
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
        const finalizerOutput = finalizerResponse.payload.data as FinalizerAgentOutput;

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
                : [
                    appLanguage === 'es'
                      ? 'Necesito un poco más de información para completar la receta. ¿Podés agregar los pasos de preparación o ingredientes faltantes?'
                      : 'I need a bit more information to complete the recipe. Can you add the missing preparation steps or ingredients?',
                  ],
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
          messages: [
            appLanguage === 'es'
              ? `¡Tu receta "${recipe.title}" fue guardada exitosamente!`
              : `Your recipe "${recipe.title}" was saved successfully!`,
          ],
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

    if (existing) {
      await this.sessionRepo.update(existing.id, {
        iterationCount: existing.iterationCount + 1,
        workingDraft: merged,
        missingFields: draftingOutput.missingFields,
        lastQuestions: draftingOutput.questions,
        lastUserMessage: message,
        sourceLanguage: draftingOutput.sourceLanguage,
        confidence: draftingOutput.confidence,
      });
      return { ...existing, workingDraft: merged, iterationCount: existing.iterationCount + 1 };
    }

    return this.sessionRepo.create({ appLanguage, lastUserMessage: message }).then(async (s) => {
      await this.sessionRepo.update(s.id, {
        iterationCount: 1,
        workingDraft: merged,
        missingFields: draftingOutput.missingFields,
        lastQuestions: draftingOutput.questions,
        sourceLanguage: draftingOutput.sourceLanguage,
        confidence: draftingOutput.confidence,
      });
      return { ...s, workingDraft: merged, iterationCount: 1 };
    });
  }

  private buildRejectedResponse(
    _session: RecipeCreationSession | null,
    message: string,
  ): CreateFromTextResponse {
    return { status: 'rejected', messages: [message] };
  }
}
