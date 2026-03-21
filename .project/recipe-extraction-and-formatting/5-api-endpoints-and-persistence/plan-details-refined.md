# Implementation Plan: Story 1.4 - API Endpoints & Persistence Integration

## 1. Prerequisites: Dependency Installation

No new dependencies are required. Existing dependencies in `package.json` (`next`, `prisma`, `zod`, etc.) are sufficient.

## 2. File & Directory Structure

| File Path                          | Action   | Purpose                                                                               |
| :--------------------------------- | :------- | :------------------------------------------------------------------------------------ |
| `lib/db/prisma.ts`                 | New      | Prisma client singleton pattern.                                                      |
| `lib/types/sse.ts`                 | New      | Type definitions for Server-Sent Events (SSE).                                        |
| `lib/utils/sseStream.ts`           | New      | Generic, typed utility for creating SSE `ReadableStream`s.                            |
| `lib/services/recipeService.ts`    | New      | Data service for persisting recipes using Prisma.                                     |
| `lib/mas/types/extraction.ts`      | Modified | Update `RecipeExtractionPayload` to include `onProgress`.                             |
| `lib/mas/core/Supervisor.ts`       | Modified | Make `orchestrate` public, remove concrete `runExtractionWorkflow`.                   |
| `lib/mas/RecipeSupervisor.ts`      | New      | Concrete Supervisor extending base, implements `runExtractionWorkflow` with progress. |
| `app/api/recipes/extract/route.ts` | New      | Next.js 16 App Router POST handler with SSE streaming.                                |
| `lib/mas/index.ts`                 | Modified | Barrel export `RecipeSupervisor`.                                                     |

## 3. Type & Interface Definitions

### `lib/types/sse.ts`

Definitions for the discriminated union of SSE events.

```typescript
import { Recipe } from '@prisma/client';

/**
 * Valid stages for the 'progress' SSE event.
 */
export type PipelineStage =
  | 'fetching' // Fetching HTML from URL
  | 'extracting' // LLM parsing the recipe
  | 'curating' // LLM reviewing quality
  | 'retrying' // Curation rejected, re-extracting
  | 'persisting'; // Saving to database

/**
 * Base structure for all SSE events.
 */
interface BaseSSEEvent {
  event: 'progress' | 'result' | 'error';
  data: unknown;
}

/**
 * SSE 'progress' event payload.
 */
export interface ProgressEvent extends BaseSSEEvent {
  event: 'progress';
  data: {
    stage: PipelineStage;
    message: string;
    attempt?: number; // Included for 'retrying' stage
  };
}

/**
 * SSE 'result' event payload.
 */
export interface ResultEvent extends BaseSSEEvent {
  event: 'result';
  data: {
    recipe: Recipe & {
      ingredients: object[];
      instructionSteps: object[];
    };
  };
}

/**
 * Error codes for the SSE 'error' event.
 */
export type SSEErrorCode =
  | 'INVALID_INPUT' // URL validation failure
  | 'PARSING_FAILED' // LLM parsing/validation failure
  | 'RATE_LIMITED' // LLM rate limit hit
  | 'SERVICE_UNAVAILABLE' // Circuit breaker open
  | 'INTERNAL_ERROR'; // Generic MAS/system error

/**
 * SSE 'error' event payload.
 */
export interface ErrorEvent extends BaseSSEEvent {
  event: 'error';
  data: {
    code: SSEErrorCode;
    message: string;
  };
}

/**
 * Discriminated union of all possible typed SSE events for the stream.
 */
export type RecipeSSEEvent = ProgressEvent | ResultEvent | ErrorEvent;
```

### `app/api/recipes/extract/route.ts` (Zod Schema)

Zod schema for request body validation.

```typescript
import { z } from 'zod';

export const extractRecipeRequestSchema = z.object({
  url: z
    .string()
    .url('Invalid URL format')
    .describe('The URL of the webpage containing the recipe'),
});

export type ExtractRecipeRequest = z.infer<typeof extractRecipeRequestSchema>;
```

## 4. Infrastructure / Utility Designs

### `lib/db/prisma.ts`

Prisma client singleton to prevent connection exhaustion.

```typescript
import { PrismaClient } from '@prisma/client';

// Prevent multiple instances of Prisma Client in development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
```

### `lib/utils/sseStream.ts`

Generic, reusable SSE stream helper with a typed `enqueue` function.

```typescript
import { RecipeSSEEvent } from '../types/sse';

/**
 * Helper to format data into the SSE wire format (event: ..., data: ...).
 */
function formatSSE(event: RecipeSSEEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

/**
 * Creates a ReadableStream for Server-Sent Events.
 * Provides an 'enqueue' function to send typed events and handles closing the stream.
 */
export function createSSEStream() {
  let controller: ReadableStreamDefaultController | undefined;

  const stream = new ReadableStream({
    start(ctr) {
      controller = ctr;
    },
    cancel() {
      // Handle client disconnect if needed
      controller = undefined;
    },
  });

  const encoder = new TextEncoder();

  /**
   * Encodes and enqueues a typed SSE event into the stream.
   */
  const enqueue = (event: RecipeSSEEvent) => {
    if (controller) {
      controller.enqueue(encoder.encode(formatSSE(event)));
    }
  };

  /**
   * Closes the SSE stream.
   */
  const close = () => {
    if (controller) {
      controller.close();
      controller = undefined;
    }
  };

  return { stream, enqueue, close };
}
```

### `lib/services/recipeService.ts`

Data service for atomic persistence using Prisma nested `create`s.

```typescript
import { ExtractedRecipe, CuratedRecipe } from '../mas/types/extraction';
import { prisma } from '../db/prisma';
import { Logger } from '../infra/Logger';
import { ChefcitoError } from '../types/exceptions';

const logger = Logger.getInstance();

export class RecipeService {
  /**
   * Persists an extracted/curated recipe to the database with all relations.
   * Uses an atomic nested create for transactional integrity.
   */
  async createRecipe(
    recipeData: ExtractedRecipe | CuratedRecipe,
    originalUrl: string,
  ) {
    logger.info(
      'lib.services.recipeService.createRecipe',
      'Persisting recipe',
      {
        title: recipeData.title,
        url: originalUrl,
      },
    );

    try {
      const persistedRecipe = await prisma.recipe.create({
        data: {
          title: recipeData.title,
          summary: 'summary' in recipeData ? recipeData.summary : null, // Handle summary for CuratedRecipe
          servings: recipeData.servings,
          prepTimeMinutes: recipeData.prepTimeMinutes,
          cookTimeMinutes: recipeData.cookTimeMinutes,
          totalTimeMinutes: recipeData.totalTimeMinutes,
          sourceUrl: originalUrl,
          imageUrl: recipeData.imageUrl,
          ingredients: {
            create: recipeData.ingredients.map((ing) => ({
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
              notes: ing.notes,
              originalString: ing.originalString,
            })),
          },
          instructionSteps: {
            create: recipeData.instructions.map((step, index) => ({
              stepNumber: index + 1,
              description: step.description,
              imageUrl: step.imageUrl,
            })),
          },
        },
        include: {
          ingredients: true, // Include relations for the final response
          instructionSteps: true,
        },
      });

      logger.info(
        'lib.services.recipeService.createRecipe',
        'Recipe persisted successfully',
        { recipeId: persistedRecipe.id },
      );
      return persistedRecipe;
    } catch (error) {
      logger.error(
        'lib.services.recipeService.createRecipe',
        'Failed to persist recipe',
        { error, title: recipeData.title },
      );
      throw new ChefcitoError(
        'PERSISTENCE_FAILED',
        'Failed to save recipe to database',
      );
    }
  }
}

// Export a singleton instance
export const recipeService = new RecipeService();
```

## 5. Integration Changes

### `lib/mas/types/extraction.ts` (Modified)

Update payload to include the progress callback.

```typescript
// ... existing imports ...
import { PipelineStage } from '../../types/sse';

/**
 * Progress callback type for the extraction workflow.
 */
export type OnProgressCallback = (
  stage: PipelineStage,
  message: string,
) => void;

export interface RecipeExtractionPayload extends AgentMessagePayload {
  url: string;
  onProgress?: OnProgressCallback; // Add optional progress callback
}

// ... rest of the file ...
```

### `lib/mas/core/Supervisor.ts` (Modified)

Make `orchestrate` public, remove concrete `runExtractionWorkflow`. The abstract `Supervisor` is now focused on infrastructure (`orchestrate`) and agent registration, while concrete classes define workflows.

```typescript
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../../infra/Logger';
import { MASError, MASInternalError } from '../types/exceptions';
import { Agent } from './Agent';

export abstract class Supervisor {
  protected agents: Map<string, Agent> = new Map();
  protected logger = Logger.getInstance();

  /**
   * registers an agent with the supervisor
   */
  protected registerAgent(agent: Agent): void {
    this.agents.set(agent.getId(), agent);
  }

  /**
   * retrieves an agent by its id
   */
  protected getAgent<T extends Agent>(agentId: string): T {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new MASInternalError(`Agent with id ${agentId} not found`);
    }
    return agent as T;
  }

  /**
   * Orchestrates a workflow, handling correlationId propagation, structured logging, and error handling.
   * Now PUBLIC so API route can generate and set the initial correlationId.
   */
  public async orchestrate<TInput, TOutput>(
    workflowName: string,
    input: TInput,
    workflowLogic: (correlationId: string) => Promise<TOutput>,
  ): Promise<TOutput> {
    // Generate correlation ID if not present, but log if it's new
    let correlationId = this.logger.getCorrelationId();
    let isNewId = false;

    if (!correlationId) {
      correlationId = uuidv4();
      this.logger.setCorrelationId(correlationId);
      isNewId = true;
    }

    this.logger.info(
      `${workflowName}.start`,
      `Starting workflow: ${workflowName}`,
      {
        input: this.sanitizeInput(input),
        isNewCorrelationId: isNewId,
      },
    );

    try {
      const result = await workflowLogic(correlationId);

      this.logger.info(
        `${workflowName}.end`,
        `Workflow ${workflowName} completed successfully`,
        {
          output: this.sanitizeOutput(result),
        },
      );

      return result;
    } catch (error) {
      // If it's not already an MASError, wrap it
      const masError =
        error instanceof MASError
          ? error
          : new MASInternalError(
              `Unexpected error in workflow ${workflowName}`,
              { originalError: error },
            );

      this.logger.error(
        `${workflowName}.error`,
        `Error in workflow ${workflowName}`,
        {
          error: masError,
          errorCode: masError.code,
        },
      );

      throw masError;
    }
  }

  /**
   * Sanitizes input for logging (override to mask sensitive data)
   */
  protected sanitizeInput(input: any): any {
    return input;
  }

  /**
   * Sanitizes output for logging (override to mask sensitive data)
   */
  protected sanitizeOutput(output: any): any {
    return output;
  }
}
```

### `lib/mas/RecipeSupervisor.ts` (New)

Concrete Supervisor implementing `runExtractionWorkflow` (moved from base), accepting the `onProgress` callback and returning `ExtractedRecipe | CuratedRecipe`.

```typescript
import { Supervisor } from './core/Supervisor';
import { RecipeExtractionAgent } from './agents/RecipeExtractionAgent';
import { RecipeCuratorAgent } from './agents/RecipeCuratorAgent';
import { AgentResponse, AgentState } from './types/mas';
import {
  ExtractedRecipe,
  CuratedRecipe,
  CurationResult,
  RecipeExtractionPayload,
  RecipeCurationPayload,
  OnProgressCallback,
} from './types/extraction';
import { MASInternalError, MASError } from './types/exceptions';

export class RecipeSupervisor extends Supervisor {
  constructor() {
    super();
    // Register agents - order matters for dependency injection if needed
    this.registerAgent(new RecipeExtractionAgent());
    this.registerAgent(new RecipeCuratorAgent());
  }

  /**
   * Runs the full extraction workflow: Fetch -> Extract -> Curate (with retries).
   * Emits progress events via the onProgress callback.
   */
  public async runExtractionWorkflow(
    url: string,
    onProgress?: OnProgressCallback,
  ) {
    return this.orchestrate(
      'recipeExtractionWorkflow',
      { url },
      async (correlationId) => {
        onProgress?.('fetching', 'Fetching webpage content...');
        const extractionAgent = this.getAgent<RecipeExtractionAgent>(
          'RecipeExtractionAgent',
        );
        const curatorAgent =
          this.getAgent<RecipeCuratorAgent>('RecipeCuratorAgent');

        let currentAttempt = 1;
        const maxAttempts = 3;
        let lastRejectionReason: string | undefined;

        // Pipeline State
        let state = AgentState.IDLE;
        let extractedRecipe: ExtractedRecipe | undefined;
        let curatedRecipe: CuratedRecipe | undefined;

        while (currentAttempt <= maxAttempts) {
          if (currentAttempt > 1) {
            onProgress?.(
              'retrying',
              `Curator rejected, re-attempting extraction (Attempt ${currentAttempt}/${maxAttempts})...`,
              currentAttempt,
            );
          } else {
            onProgress?.('extracting', 'Parsing recipe content...');
          }

          // --- Stage 1: Extraction ---
          const extractPayload: RecipeExtractionPayload = {
            url,
            correlationId,
          };
          const extractResponse: AgentResponse<ExtractedRecipe> =
            await extractionAgent.process(extractPayload);

          if (extractResponse.state === AgentState.ERROR) {
            throw new MASInternalError('Extraction agent failed', {
              details: extractResponse.error,
            });
          }
          extractedRecipe = extractResponse.data;

          // --- Stage 2: Curation ---
          onProgress?.('curating', 'Reviewing recipe quality...');
          const curationPayload: RecipeCurationPayload = {
            recipe: extractedRecipe!, // Non-null assertion is safe after error check
            correlationId,
            isRetry: currentAttempt > 1,
            previousRejectionReason: lastRejectionReason,
          };

          const curateResponse: AgentResponse<CurationResult> =
            await curatorAgent.process(curationPayload);

          // --- Graceful Curator Error Handling ---
          // If curator fails (throws, not just rejects), log but continue with raw extraction (no summary)
          if (curateResponse.state === AgentState.ERROR) {
            this.logger.error(
              'recipeExtractionWorkflow.curatorError',
              'Curator agent failed, continuing with uncurated recipe',
              {
                error: curateResponse.error,
                recipeTitle: extractedRecipe.title,
              },
            );
            state = AgentState.COMPLETED;
            return extractedRecipe; // Return without summary
          }

          const curationResult = curateResponse.data;

          // --- Curation Logic ---
          if (curationResult.status === 'approved') {
            // Success! Build CuratedRecipe with summary
            curatedRecipe = {
              ...extractedRecipe,
              summary: curationResult.summary!, // Non-null assertion safe for approved status
            };
            this.logger.info(
              'recipeExtractionWorkflow.approved',
              'Recipe approved by curator',
              { recipeId: extractedRecipe.id },
            );
            state = AgentState.COMPLETED;
            return curatedRecipe; // Exit loop on success
          }

          if (curationResult.status === 'rejected') {
            // Retry logic
            lastRejectionReason = curationResult.rejectionReason;
            this.logger.warn(
              'recipeExtractionWorkflow.rejected',
              `Recipe rejected by curator (Attempt ${currentAttempt}/${maxAttempts})`,
              {
                reason: lastRejectionReason,
                recipeTitle: extractedRecipe.title,
              },
            );
            currentAttempt++;
          }
        }

        // If we reach here, we've exhausted retries. Return the last raw extraction.
        this.logger.warn(
          'recipeExtractionWorkflow.maxRetriesExceeded',
          'Exceeded maximum curation retries, returning uncurated recipe',
          {
            lastRejectionReason,
            recipeTitle: extractedRecipe?.title,
          },
        );
        state = AgentState.COMPLETED;
        return extractedRecipe!; // Non-null safe after first extraction success check
      },
    );
  }

  // Override sanitization to mask URL if needed (but probably safe for logging here)
  protected sanitizeInput(input: any): any {
    return { url: input.url }; // Keep it simple
  }

  protected sanitizeOutput(output: any): any {
    if (!output) return output;
    return { id: output.id, title: output.title }; // Just log id/title
  }
}
```

### `app/api/recipes/extract/route.ts` (New)

Next.js 16 App Router POST handler returning SSE `ReadableStream`.

```typescript
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { extractRecipeRequestSchema, ExtractRecipeRequest } from './route.ts'; // Zod schema from step 3
import { createSSEStream } from '../../../lib/utils/sseStream';
import { RecipeSupervisor } from '../../../lib/mas/RecipeSupervisor';
import { recipeService } from '../../../lib/services/recipeService';
import { Logger } from '../../../lib/infra/Logger';
import {
  PipelineStage,
  RecipeSSEEvent,
  SSEErrorCode,
} from '../../../lib/types/sse';
import {
  MASError,
  LLMParsingError,
  LLMRateLimitError,
  CircuitBreakerOpenError,
} from '../../../lib/mas/types/exceptions';
import {
  ExtractedRecipe,
  CuratedRecipe,
} from '../../../lib/mas/types/extraction';

const logger = Logger.getInstance();

// Set appropriate headers for SSE
const sseHeaders = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  // Necessary for cross-origin if frontend is separate (unlikely for Chefcito but good practice)
  // 'Access-Control-Allow-Origin': '*',
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
    // Other generic MAS errors
    return {
      code: 'INTERNAL_ERROR',
      message: 'An internal error occurred during processing.',
    };
  }
  // Fallback for non-MAS errors (should be rare due to Supervisor wrapping)
  logger.error(
    'api.recipes.extract.unwrappedError',
    'Unwrapped error during extraction',
    { error },
  );
  return {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected internal error occurred.',
  };
}

export async function POST(request: Request) {
  // Generate a correlation ID for this request
  const correlationId = uuidv4();
  logger.setCorrelationId(correlationId);

  logger.info(
    'api.recipes.extract.post.start',
    'Received recipe extraction request',
  );

  const { stream, enqueue, close } = createSSEStream();

  // Run the pipeline as an unawaited async IIFE so we can return the stream immediately
  (async () => {
    let result: ExtractedRecipe | CuratedRecipe | undefined;
    let originalUrl: string | undefined;

    try {
      // 1. Request Body Parsing & Validation
      const body = await request.json();
      const validationResult = extractRecipeRequestSchema.safeParse(body);

      if (!validationResult.success) {
        // Validation Error: emit 'error' event and close
        const message = validationResult.error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', ');
        logger.warn(
          'api.recipes.extract.post.validationError',
          'Invalid request body',
          { message },
        );
        enqueue({
          event: 'error',
          data: { code: 'INVALID_INPUT', message: `Invalid input: ${message}` },
        });
        close();
        return;
      }
      originalUrl = validationResult.data.url;

      // 2. Supervisor Invocation
      const supervisor = new RecipeSupervisor();

      // Progress callback wires SSE enqueue
      const onProgress = (
        stage: PipelineStage,
        message: string,
        attempt?: number,
      ) => {
        logger.info('api.recipes.extract.post.progress', message, {
          stage,
          attempt,
        });
        enqueue({
          event: 'progress',
          data: { stage, message, attempt },
        });
      };

      // Run workflow (this will handle retries, errors via orchestrate)
      result = await supervisor.runExtractionWorkflow(originalUrl, onProgress);

      // 3. Persistence
      onProgress('persisting', 'Saving recipe to database...');
      const persistedRecipe = await recipeService.createRecipe(
        result,
        originalUrl,
      );

      // 4. Final Success Event
      enqueue({ event: 'result', data: { recipe: persistedRecipe } });
    } catch (error) {
      // Pipeline Failure: emit mapped 'error' event
      const sseError = mapErrorToSSE(error);
      enqueue({ event: 'error', data: sseError });
    } finally {
      // Always close the stream at the end
      logger.info('api.recipes.extract.post.end', 'Closing SSE stream');
      close();
    }
  })();

  // Return the stream with SSE headers immediately
  return new NextResponse(stream, { headers: sseHeaders });
}
```

### `lib/mas/index.ts` (Modified)

Update barrel exports to include the new supervisor.

```typescript
// ... other exports ...
export { Supervisor } from './core/Supervisor';
export { RecipeSupervisor } from './RecipeSupervisor'; // Add new export
export { CircuitBreaker } from './core/CircuitBreaker';
// ... other exports ...
```

## 6. Constraints & Decisions

- **Supervisor Refactoring:** The original abstract `Supervisor` had a concrete `runExtractionWorkflow`. This violates the Dependency Inversion Principle and makes the class rigid. I decided to remove the concrete workflow and leave the abstract class focused _only_ on the infrastructure it provides (`orchestrate`, agent registration). The concrete `RecipeSupervisor` now defines the specific workflow.
- **SSE streaming:** The API route returns a standard `ReadableStream` with `Content-Type: text/event-stream`.
- **Request Validation:** Reused the Zod schema definition from previous stories, keeping validation centralized.
- **Atomic Persistence:** `RecipeService` uses Prisma's nested `create` for atomic transactional integrity when saving the recipe with its ingredients and instruction steps. This ensures data consistency.
- **Existing Infrastructure:** Leveraged `Logger` (CorrelationId), `CircuitBreaker`, and `MASError` hierarchy. Do NOT re-implement these features in the API layer. The Supervisor's `orchestrate` handles logging and wrapping exceptions in `MASError`.
- **Prettier:** semi, singleQuote, trailingComma: "all", tabWidth: 2, printWidth: 80

## 7. Verification Checklist

- [ ] New Dependencies: N/A.
- [ ] Zod schema `extractRecipeRequestSchema` validates POST request body with `url`.
- [ ] Prisma Client Singleton `lib/db/prisma.ts` is implemented.
- [ ] SSE Event Type Definitions (`PipelineStage`, `RecipeSSEEvent` union) in `lib/types/sse.ts`.
- [ ] Typed SSE Stream Helper `lib/utils/sseStream.ts` is implemented and generic.
- [ ] Prisma Data Service `lib/services/recipeService.ts` handles nested transactional creates.
- [ ] Abstract `Supervisor` refactored (orchestrate is public, no concrete `runExtractionWorkflow`).
- [ ] Concrete `RecipeSupervisor` implemented (constructor registers agents, `runExtractionWorkflow` accepts progress callback, returns extraction types).
- [ ] API Route Handler `app/api/recipes/extract/route.ts` implements POST handler.
- [ ] API Route handles request validation (emits SSE error on failure).
- [ ] API Route generates correlation ID and sets it on the Logger before Supervisor call.
- [ ] API Route wires progress callback to SSE stream enqueue.
- [ ] API Route invokes Supervisor and handles success (persists, emits SSE result).
- [ ] API Route maps MASErrors to SSE error events and enqueues them.
- [ ] API Route ensures SSE stream is _always_ closed (finally block).
- [ ] Barrel exports updated in `lib/mas/index.ts`.
