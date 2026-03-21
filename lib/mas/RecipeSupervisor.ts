import { Supervisor } from './core/Supervisor';
import { LLMConnector } from './core/LLMConnector';
import { RecipeExtractionAgent } from './agents/RecipeExtractionAgent';
import { RecipeCuratorAgent } from './agents/RecipeCuratorAgent';
import type { AgentRequest, AgentResponse } from './types/mas';
import { AgentState } from './types/mas';
import type {
  ExtractedRecipe,
  CuratedRecipe,
  CurationResult,
  RecipeExtractionPayload,
  RecipeCurationPayload,
  OnProgressCallback,
} from './types/extraction';
import { Logger } from '@/lib/infra/Logger';

const MAX_CURATION_RETRIES = 2;

export class RecipeSupervisor extends Supervisor {
  constructor() {
    super('RecipeSupervisor');
    const llmConnector = LLMConnector.getInstance();
    this.registerAgent(new RecipeExtractionAgent(llmConnector));
    this.registerAgent(new RecipeCuratorAgent(llmConnector));
  }

  /**
   * Runs the full extraction workflow: Fetch -> Extract -> Curate
   * (with retries). Emits progress events via the onProgress callback.
   */
  public async runExtractionWorkflow(
    url: string,
    onProgress?: OnProgressCallback,
  ): Promise<ExtractedRecipe | CuratedRecipe> {
    return this.orchestrate(
      'recipeExtractionWorkflow',
      { url },
      async (correlationId) => {
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
        let lastExtractedRecipe: ExtractedRecipe | undefined;

        while (attempt <= MAX_CURATION_RETRIES) {
          attempt++;

          if (attempt > 1) {
            onProgress?.(
              'retrying',
              `Improving recipe, trying again (attempt ${attempt} of ${MAX_CURATION_RETRIES + 1})...`,
              attempt,
            );
          } else {
            onProgress?.('fetching', 'Loading recipe from URL...');
          }

          // --- Stage 1: Extraction ---
          onProgress?.('extracting', 'Reading recipe details...');

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
          lastExtractedRecipe = extractedRecipe;

          // --- Stage 2: Curation ---
          onProgress?.('curating', 'Checking recipe quality...');

          let curationResult: CurationResult | undefined;
          try {
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
            curationResult = curationResponse.payload.data as CurationResult;
          } catch (curationError: unknown) {
            // Curator failed — return the extraction without summary
            logger.log({
              timestamp: '',
              level: 'warn',
              message: `[Supervisor: ${this.name}] Curation failed, returning extraction without summary: ${curationError instanceof Error ? curationError.message : String(curationError)}`,
              correlationId,
            });
            return extractedRecipe;
          }

          if (curationResult.approved) {
            const curatedRecipe: CuratedRecipe = {
              ...extractedRecipe,
              summary: curationResult.summary ?? '',
            };

            logger.log({
              timestamp: '',
              level: 'info',
              message: `[Supervisor: ${this.name}] Recipe approved by curator`,
              correlationId,
              data: { title: extractedRecipe.title },
            });

            return curatedRecipe;
          }

          // Rejected — feed the reason back for the next extraction attempt
          rejectionFeedback = curationResult.reason;
          logger.log({
            timestamp: '',
            level: 'warn',
            message: `[Supervisor: ${this.name}] Curation rejected (attempt ${attempt}): ${curationResult.reason}`,
            correlationId,
            data: { title: extractedRecipe.title },
          });
        }

        // Exhausted retries — return the last raw extraction
        logger.log({
          timestamp: '',
          level: 'warn',
          message: `[Supervisor: ${this.name}] Exceeded maximum curation retries, returning uncurated recipe`,
          correlationId,
          data: {
            lastRejectionReason: rejectionFeedback,
            title: lastExtractedRecipe?.title,
          },
        });

        return lastExtractedRecipe!;
      },
    );
  }
}
