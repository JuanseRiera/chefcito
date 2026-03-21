import { ChefcitoError } from '@/lib/types/exceptions';
import type { AgentState } from './mas';

/**
 * Base class for all Multi-Agent System (MAS) related errors.
 */
export class MASError extends ChefcitoError {
  constructor(
    message: string,
    code: string,
    public readonly agentName?: string,
    public readonly agentState?: AgentState,
    public readonly originalError?: unknown,
  ) {
    super(message, code);
  }
}

/**
 * Errors that occur during interaction with the LLM.
 */
export class LLMError extends MASError {
  constructor(
    message: string,
    code: string,
    public readonly isTransient: boolean = false,
    originalError?: unknown,
  ) {
    super(message, code, undefined, undefined, originalError);
  }
}

export class LLMConnectionError extends LLMError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'LLM_CONNECTION_FAILED', true, originalError);
  }
}

export class LLMRateLimitError extends LLMError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'LLM_RATE_LIMITED', true, originalError);
  }
}

export class LLMQuotaExceededError extends LLMError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'LLM_QUOTA_EXCEEDED', false, originalError);
  }
}

export class LLMParsingError extends MASError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'LLM_PARSING_FAILED', undefined, undefined, originalError);
  }
}

/**
 * Represents a generic error within the MAS infrastructure itself.
 */
export class MASInternalError extends MASError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'MAS_INTERNAL_ERROR', undefined, undefined, originalError);
  }
}

/**
 * Error type when the Circuit Breaker is open.
 */
export class CircuitBreakerOpenError extends MASError {
  constructor(message: string) {
    super(message, 'CIRCUIT_BREAKER_OPEN');
  }
}
