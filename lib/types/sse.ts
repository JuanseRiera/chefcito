import type {
  Recipe,
  Ingredient,
  InstructionStep,
} from '@/prisma/generated/client';

/**
 * Valid stages for the 'progress' SSE event.
 */
export type PipelineStage =
  | 'fetching' // Fetching HTML from URL
  | 'extracting' // LLM parsing the recipe
  | 'curating' // LLM reviewing quality
  | 'retrying' // Curation rejected, re-extracting
  | 'persisting' // Saving to database
  | 'uploading_image'; // Uploading recipe image to storage

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
      ingredients: Ingredient[];
      instructionSteps: InstructionStep[];
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
