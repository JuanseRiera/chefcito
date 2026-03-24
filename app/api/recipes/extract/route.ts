import { z } from 'zod';
import { createSSEStream } from '@/lib/utils/sseStream';
import { RecipeSupervisor } from '@/lib/mas/RecipeSupervisor';
import { getRecipeService } from '@/lib/services/recipeService';
import { uploadImageFromUrl } from '@/lib/infra/imageStorage';
import { Logger } from '@/lib/infra/Logger';
import type { PipelineStage, SSEErrorCode } from '@/lib/types/sse';
import {
  MASError,
  LLMParsingError,
  LLMRateLimitError,
  CircuitBreakerOpenError,
} from '@/lib/mas/types/exceptions';

const logger = Logger.getInstance();

const extractRecipeRequestSchema = z.object({
  url: z
    .string()
    .url('Invalid URL format')
    .describe('The URL of the webpage containing the recipe'),
});

const sseHeaders = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
};

/**
 * Maps MAS errors to the appropriate SSE 'error' event payload.
 */
function mapErrorToSSE(error: unknown): {
  code: SSEErrorCode;
  message: string;
} {
  if (error instanceof LLMParsingError) {
    return {
      code: 'PARSING_FAILED',
      message: 'Could not parse recipe from this URL.',
    };
  }
  if (error instanceof LLMRateLimitError) {
    return {
      code: 'RATE_LIMITED',
      message: 'The AI is currently under heavy load, please try again later.',
    };
  }
  if (error instanceof CircuitBreakerOpenError) {
    return {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Recipe extraction service is currently unavailable.',
    };
  }
  if (error instanceof MASError) {
    return {
      code: 'INTERNAL_ERROR',
      message: 'An internal error occurred during processing.',
    };
  }
  logger.log({
    timestamp: '',
    level: 'error',
    message: `[api.recipes.extract] Unwrapped error during extraction`,
    data: { error },
  });
  return {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected internal error occurred.',
  };
}

export async function POST(request: Request) {
  const correlationId = logger.generateCorrelationId();
  logger.setCorrelationId(correlationId);

  logger.log({
    timestamp: '',
    level: 'info',
    message: '[api.recipes.extract] Received recipe extraction request',
    correlationId,
  });

  const { stream, enqueue, close } = createSSEStream();

  // Run the pipeline as an unawaited async IIFE so we can return
  // the stream immediately
  (async () => {
    try {
      // 1. Request Body Parsing & Validation
      const body: unknown = await request.json();
      const validationResult = extractRecipeRequestSchema.safeParse(body);

      if (!validationResult.success) {
        const message = validationResult.error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join(', ');
        logger.log({
          timestamp: '',
          level: 'warn',
          message: `[api.recipes.extract] Invalid request body: ${message}`,
          correlationId,
        });
        enqueue({
          event: 'error',
          data: {
            code: 'INVALID_INPUT',
            message: `Invalid input: ${message}`,
          },
        });
        close();
        return;
      }

      const originalUrl = validationResult.data.url;

      // 2. Supervisor Invocation
      const supervisor = new RecipeSupervisor();

      const onProgress = (
        stage: PipelineStage,
        message: string,
        attempt?: number,
      ) => {
        logger.log({
          timestamp: '',
          level: 'info',
          message: `[api.recipes.extract] ${message}`,
          correlationId,
          data: { stage, attempt },
        });
        enqueue({
          event: 'progress',
          data: { stage, message, attempt },
        });
      };

      const { recipe: result, imageUrl } =
        await supervisor.runExtractionWorkflow(originalUrl, onProgress);

      // 3. Persistence
      onProgress('persisting', 'Saving your recipe...');
      const recipeService = getRecipeService();
      const persistedRecipe = await recipeService.createRecipe(
        result,
        originalUrl,
      );

      // 4. Image Upload
      if (imageUrl) {
        onProgress('uploading_image', 'Uploading recipe image...');
        const publicUrl = await uploadImageFromUrl(imageUrl, persistedRecipe.id);
        if (publicUrl) {
          await recipeService.updateRecipeImage(persistedRecipe.id, publicUrl);
          persistedRecipe.imageUrl = publicUrl;
        }
      }

      // 5. Final Success Event
      enqueue({ event: 'result', data: { recipe: persistedRecipe } });
    } catch (error) {
      const sseError = mapErrorToSSE(error);
      enqueue({ event: 'error', data: sseError });
    } finally {
      logger.log({
        timestamp: '',
        level: 'info',
        message: '[api.recipes.extract] Closing SSE stream',
        correlationId,
      });
      close();
    }
  })();

  return new Response(stream, { headers: sseHeaders });
}
