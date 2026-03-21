import type { Recipe } from '@/prisma/generated/client';
import type { Agent } from './Agent';
import { LLMConnector } from './LLMConnector';
import { Logger, type CorrelationId } from '@/lib/infra/Logger';
import type { MASError } from '../types/exceptions';
import type { AgentRequest, AgentResponse } from '../types/mas';
import { AgentState } from '../types/mas';
import { RecipeExtractionAgent } from '../agents/RecipeExtractionAgent';
import type {
  RecipeExtractionPayload,
  ExtractedRecipe,
} from '../types/extraction';

export abstract class Supervisor {
  protected agents: Map<string, Agent> = new Map();

  constructor(public readonly name: string) {
    const llmConnector = LLMConnector.getInstance();
    this.registerAgent(new RecipeExtractionAgent(llmConnector));
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
      const extractionAgent = this.getAgent('RecipeExtractionAgent');
      if (!extractionAgent) {
        throw new Error('Agent "RecipeExtractionAgent" not found.');
      }

      const request: AgentRequest = {
        id: crypto.randomUUID(),
        from: this.name,
        to: extractionAgent.name,
        payload: {
          data: input,
          meta: { correlationId },
        },
        state: AgentState.IDLE,
        timestamp: new Date(),
      };

      const response: AgentResponse = await extractionAgent.process(request);
      const extractedRecipe = response.payload.data as ExtractedRecipe;

      // Map ExtractedRecipe to Prisma Recipe shape (no DB write in this story)
      const recipeData: Recipe = {
        id: '',
        title: extractedRecipe.title,
        description: extractedRecipe.description,
        originalUrl: url,
        author: extractedRecipe.author,
        isFormatted: true,
        servings: extractedRecipe.servings,
        prepTime: extractedRecipe.prepTime,
        cookTime: extractedRecipe.cookTime,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return recipeData;
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
