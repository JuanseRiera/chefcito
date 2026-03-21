import type { Recipe } from '@/prisma/generated/client';
import type { Agent } from './Agent';
import { LLMConnector } from './LLMConnector';
import { Logger, type CorrelationId } from '@/lib/infra/Logger';
import type { MASError } from '../types/exceptions';
import type { AgentRequest, AgentResponse } from '../types/mas';
import { AgentState } from '../types/mas';
import { RecipeExtractionAgent } from '../agents/RecipeExtractionAgent';
import { RecipeCuratorAgent } from '../agents/RecipeCuratorAgent';
import type {
  RecipeExtractionPayload,
  RecipeCurationPayload,
  ExtractedRecipe,
  CurationResult,
  CuratedRecipe,
} from '../types/extraction';

const MAX_CURATION_RETRIES = 2;

export abstract class Supervisor {
  protected agents: Map<string, Agent> = new Map();

  constructor(public readonly name: string) {
    const llmConnector = LLMConnector.getInstance();
    this.registerAgent(new RecipeExtractionAgent(llmConnector));
    this.registerAgent(new RecipeCuratorAgent(llmConnector));
  }

  public registerAgent(agent: Agent): void {
    if (this.agents.has(agent.name)) {
      throw new Error(`Agent with name "${agent.name}" is already registered.`);
    }
    this.agents.set(agent.name, agent);
  }

  public getAgent(name: string): Agent | undefined {
    return this.agents.get(name);
  }

  public async runExtractionWorkflow(url: string): Promise<Recipe> {
    const workflowName = 'runExtractionWorkflow';
    const input: RecipeExtractionPayload = { url };

    return this.orchestrate(workflowName, input, async (correlationId) => {
      const logger = Logger.getInstance();

      const extractionAgent = this.getAgent('RecipeExtractionAgent');
      if (!extractionAgent) {
        throw new Error('Agent "RecipeExtractionAgent" not found.');
      }
      const curatorAgent = this.getAgent('RecipeCuratorAgent');
      if (!curatorAgent) {
        throw new Error('Agent "RecipeCuratorAgent" not found.');
      }

      let rejectionFeedback: string | undefined;
      let attempt = 0;

      while (attempt <= MAX_CURATION_RETRIES) {
        attempt++;

        logger.log({
          timestamp: '',
          level: 'info',
          message: `[Supervisor: ${this.name}] Extraction attempt ${attempt}/${MAX_CURATION_RETRIES + 1}.`,
          correlationId,
        });

        // Step 1: Extract
        const extractionPayload: RecipeExtractionPayload = {
          url,
          rejectionFeedback,
        };
        const extractionRequest: AgentRequest = {
          id: crypto.randomUUID(),
          from: this.name,
          to: extractionAgent.name,
          payload: {
            data: extractionPayload,
            meta: { correlationId },
          },
          state: AgentState.IDLE,
          timestamp: new Date(),
        };

        const extractionResponse: AgentResponse =
          await extractionAgent.process(extractionRequest);
        const extractedRecipe = extractionResponse.payload
          .data as ExtractedRecipe;

        // Step 2: Curate
        const curationPayload: RecipeCurationPayload = {
          recipe: extractedRecipe,
        };
        const curationRequest: AgentRequest = {
          id: crypto.randomUUID(),
          from: this.name,
          to: curatorAgent.name,
          payload: {
            data: curationPayload,
            meta: { correlationId },
          },
          state: AgentState.IDLE,
          timestamp: new Date(),
        };

        const curationResponse: AgentResponse =
          await curatorAgent.process(curationRequest);
        const curationResult = curationResponse.payload.data as CurationResult;

        if (curationResult.approved) {
          const curatedRecipe: CuratedRecipe = {
            ...extractedRecipe,
            summary: curationResult.summary ?? '',
          };

          // Map CuratedRecipe to Prisma Recipe shape (no DB write in this story)
          const recipeData: Recipe = {
            id: '',
            title: curatedRecipe.title,
            description: curatedRecipe.summary || curatedRecipe.description,
            originalUrl: url,
            author: curatedRecipe.author,
            isFormatted: true,
            servings: curatedRecipe.servings,
            prepTime: curatedRecipe.prepTime,
            cookTime: curatedRecipe.cookTime,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          return recipeData;
        }

        // Rejected — feed the reason back for the next extraction attempt
        rejectionFeedback = curationResult.reason;
        logger.log({
          timestamp: '',
          level: 'warn',
          message: `[Supervisor: ${this.name}] Curation rejected (attempt ${attempt}): ${curationResult.reason}`,
          correlationId,
        });
      }

      throw new Error(
        `Recipe extraction failed after ${MAX_CURATION_RETRIES + 1} attempts. Last rejection: ${rejectionFeedback}`,
      );
    });
  }

  protected async orchestrate<TInput, TOutput>(
    workflowName: string,
    input: TInput,
    workflowLogic: (correlationId: CorrelationId) => Promise<TOutput>,
  ): Promise<TOutput> {
    const logger = Logger.getInstance();

    let correlationId = logger.getCorrelationId();
    if (!correlationId) {
      correlationId = logger.generateCorrelationId();
      logger.setCorrelationId(correlationId);
    }

    logger.log({
      timestamp: '',
      level: 'info',
      message: `[Supervisor: ${this.name}] Starting workflow: ${workflowName}.`,
      correlationId,
      data: input,
    });

    try {
      const result = await workflowLogic(correlationId);

      logger.log({
        timestamp: '',
        level: 'info',
        message: `[Supervisor: ${this.name}] Workflow ${workflowName} completed successfully.`,
        correlationId,
      });

      return result;
    } catch (error: unknown) {
      logger.log({
        timestamp: '',
        level: 'error',
        message: `[Supervisor: ${this.name}] Workflow ${workflowName} failed. Error: ${error instanceof Error ? error.message : error}`,
        correlationId,
        code: (error as MASError)?.code,
        data: (error as MASError)?.originalError,
      });

      throw error;
    }
  }
}
