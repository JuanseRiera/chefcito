# Implementation Plan: Story 1.2 - MAS Robustness & Observability (Using Libraries)

## 1. Prerequisites: Dependency Installation

This plan requires the addition of an external library for resilience patterns.

| Package Name    | Purpose                                                                                                                                                                    |
| :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`cockatiel`** | A lightweight, well-maintained library for transient-error handling (Retry, Circuit Breaker, Bulkhead, Timeout). It will replace custom implementations of these patterns. |

**Command to execute (by the user, outside of this plan):**
`npm install cockatiel`

## 2. File & Directory Structure

New infrastructure and type definition files will be created. Existing base classes will be modified for integration. Custom retry and circuit-breaker implementations are removed.

| File Path                         | Purpose                                                                                                                                                                              |
| :-------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`lib/mas/types/exceptions.ts`** | (New) Defines the application-specific error hierarchy (`MASError`, `LLMError`, etc.), crucial for mapping SDK errors and driving resilience policies.                               |
| **`lib/mas/infra/Logger.ts`**     | (New) A singleton service providing centralized, structured logging for MAS operations with support for correlation IDs. Uses Node's built-in `console`.                             |
| **`lib/mas/infra/resilience.ts`** | (New) Configures and exports pre-defined `cockatiel` policies (Retry, Circuit Breaker) tailored for MAS operations, specifically targeting LLM interactions.                         |
| `lib/mas/types/mas.ts`            | (Modified) Define `CorrelationId` type alias. Update `AgentMessageMeta` to include correlation ID. Define interface for structured log entries.                                      |
| `lib/mas/core/Agent.ts`           | (Modified) Inject the logger, update `process` to add structured logging and standardized error handling, and propagate correlation IDs from metadata.                               |
| `lib/mas/core/Supervisor.ts`      | (Modified) Inject the logger, add a standardized `orchestrate` helper method to manage workflows, and handle correlation ID generation.                                              |
| `lib/mas/core/LLMConnector.ts`    | (Modified) Integrate pre-defined Cockatiel policies from `lib/mas/infra/resilience.ts` into the `getCompletion` method. Wrap SDK errors into MAS exceptions and log terminal errors. |
| `lib/mas/index.ts`                | (Modified) Export new types, exception classes, the `Logger` service, and the configured `resilience` policies.                                                                      |

## 3. Type & Interface Definitions

### 3.1 Exception Definitions (`lib/mas/types/exceptions.ts`)

A clean hierarchy ensures clear distinction between transient and terminal errors, enabling Cockatiel to make intelligent retry and circuit-breaker decisions. All MAS errors should inherit from `MASError`. The `isTransient` property is key.

```typescript
import { AgentState } from './mas';

// lib/mas/types/exceptions.ts

/**
 * Base error class for all application errors.
 */
export class ChefcitoError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
  }
}

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
    public readonly isTransient: boolean = false, // True if the error is retryable
    originalError?: unknown,
  ) {
    super(message, code, undefined, undefined, originalError);
  }
}

/**
 * Specific LLM errors.
 */
export class LLMConnectionError extends LLMError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'LLM_CONNECTION_FAILED', true, originalError); // Transient
  }
}

export class LLMRateLimitError extends LLMError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'LLM_RATE_LIMITED', true, originalError); // Transient
  }
}

export class LLMQuotaExceededError extends LLMError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'LLM_QUOTA_EXCEEDED', false, originalError); // Terminal
  }
}

export class LLMParsingError extends MASError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'LLM_PARSING_FAILED', undefined, undefined, originalError); // Terminal
  }
}

/**
 * Specific error type when the Circuit Breaker is open.
 * Cockatiel will throw this.
 */
export class CircuitBreakerOpenError extends MASError {
  constructor(message: string) {
    super(message, 'CIRCUIT_BREAKER_OPEN');
  }
}

/**
 * Represents a generic error within the MAS infrastructure itself.
 */
export class MASInternalError extends MASError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'MAS_INTERNAL_ERROR', undefined, undefined, originalError); // Terminal
  }
}
```

### 3.2 Core Type Updates (`lib/mas/types/mas.ts`)

These updates are required to support tracing via correlation IDs.

```typescript
// lib/mas/types/mas.ts

// 1. Define CorrelationId type alias
export type CorrelationId = string;

// 2. Define structured logging data
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  correlationId?: CorrelationId;
  agentName?: string;
  agentState?: AgentState;
  code?: string; // Error code if applicable
  data?: unknown; // Optional extra data for logging
}

// 3. Update metadata interface to include trace info
export interface AgentMessageMeta extends Record<string, unknown> {
  correlationId?: CorrelationId; // For distributed tracing
}

// 4. Update core interfaces to use the new definitions
export interface AgentMessagePayload<T = unknown> {
  data: T;
  meta?: AgentMessageMeta; // Replaces `meta?: Record<string, unknown>;`
}

// 5. Re-export existing and new types
export {
  AgentState,
  type AgentMessage,
  type AgentRequest,
  type AgentResponse,
} from './mas';
export {
  ChefcitoError,
  MASError,
  LLMError,
  LLMConnectionError,
  LLMRateLimitError,
  LLMQuotaExceededError,
  LLMParsingError,
  MASInternalError,
} from './exceptions';
```

## 4. Infrastructure Designs (`lib/mas/infra/`)

### 4.1 Centralized Logger (`lib/mas/infra/Logger.ts`)

A singleton service, using Node's built-in `console` for output. It structures logs as JSON to support efficient downstream processing. It handles trace management (correlation IDs).

| Component       | Specification                                                                                                                                                                                                                   |
| :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Class Name**  | `Logger`                                                                                                                                                                                                                        |
| **Properties**  | `private static instance: Logger`: The single instance.<br>`private currentCorrelationId?: CorrelationId`: Track the active correlation ID.                                                                                     |
| **Constructor** | `private constructor()`: Private for singleton.                                                                                                                                                                                 |
| **Methods**     | `public static getInstance(): Logger`<br>`public generateCorrelationId(): CorrelationId`: Uses Node's `crypto.randomUUID()`.<br>`public setCorrelationId(id: CorrelationId): void`<br>`public getCorrelationId(): CorrelationId | undefined`<br>`public log(entry: LogEntry): void`: Implementation detail: serializes `LogEntry`to JSON and uses`console[entry.level]`. |

**Logger Implementation Details (`log` method):**

```typescript
public log(entry: LogEntry): void {
  const finalEntry: LogEntry = {
    ...entry,
    timestamp: new Date().toISOString(), // Standard timestamp
    correlationId: entry.correlationId || this.currentCorrelationId, // Prefer explicit, fall back to tracked
  };

  const output = JSON.stringify(finalEntry);
  if (finalEntry.level === 'error') {
    console.error(output);
  } else if (finalEntry.level === 'warn') {
    console.warn(output);
  } else {
    console.info(output);
  }
}
```

### 4.2 Resilience Policies (`lib/mas/infra/resilience.ts`)

This file will configure and export Cockatiel policies. A good pattern is to create separate policies and then compose them.

1.  **Retry Policy:** Create a `RetryPolicy` with exponential backoff (e.g., base delay 500ms, max 3 retries). Configure it to retry **only** when the error is a transient `LLMError` (`handleWhen(err => err instanceof LLMError && err.isTransient)`).
2.  **Circuit Breaker Policy:** Create a `CircuitBreakerPolicy` (e.g., failure threshold 5, reset timeout 60s). Configure it to record failures when **any** `MASError` occurs.
3.  **Composition:** Compose them into a single `ResiliencePolicy` using Cockatiel's `wrap` method: `RetryPolicy.wrap(CircuitBreakerPolicy)`. This ensures that the circuit breaker is the _outer_ policy, preventing retries on a tripped circuit.

**Resilience Pseudocode:**

```typescript
import {
  handleWhen,
  retry,
  circuitBreaker,
  wrap,
  ExponentialBackoff,
  type IResiliencePolicy,
} from 'cockatiel';
import { LLMError, MASError } from '../types/exceptions';

// lib/mas/infra/resilience.ts

// 1. Retry criteria: transient LLMErrors
const retryCriteria = handleWhen(
  (err) => err instanceof LLMError && err.isTransient,
);

// 2. Retry policy: max 3 attempts with exponential backoff
const retryPolicy = retry(retryCriteria, {
  maxAttempts: 3,
  backoff: new ExponentialBackoff({ initialDelay: 500 }),
});

// 3. Circuit breaker criteria: record failure on any MASError
const circuitBreakerCriteria = handleWhen((err) => err instanceof MASError);

// 4. Circuit breaker policy: trips after 5 consecutive failures, resets after 60s
const circuitBreakerPolicy = circuitBreaker(circuitBreakerCriteria, {
  failureThreshold: 5,
  resetTimeout: 60 * 1000, // 60s
});

// Log circuit state changes for observability (Cockatiel events)
circuitBreakerPolicy.onOpen(() =>
  console.warn(
    '[CircuitBreaker: LLM] Tripped. CLOSED -> OPEN. Requests blocked.',
  ),
);
circuitBreakerPolicy.onHalfOpen(() =>
  console.warn(
    '[CircuitBreaker: LLM] Probe request allowed. OPEN -> HALF_OPEN.',
  ),
);
circuitBreakerPolicy.onClosed(() =>
  console.info(
    '[CircuitBreaker: LLM] Probe request succeeded. Circuit is CLOSED again.',
  ),
);

// 5. Compose the policies: retry is wrapped by the circuit breaker (outermost)
export const llmResiliencePolicy: IResiliencePolicy = wrap(
  circuitBreakerPolicy,
  retryPolicy,
);
```

## 5. Integration Changes

### 5.1 Update `lib/mas/core/LLMConnector.ts`

The singleton connector will import and use the composed `llmResiliencePolicy` from `lib/mas/infra/resilience.ts`. It still has the responsibility of mapping SDK errors to internal application exceptions. Terminal errors must be logged.

1.  **Refactor `getCompletion`:** Refactor the method to use the library's policy. The original SDK call (from Story 1.1) becomes the operation executed by the policy. It still accepts `correlationId` for logging.

**LLMConnector Pseudocode (`getCompletion`):**

```typescript
import { GoogleGenAI, type GenerateContentError } from '@google/genai';
import { llmResiliencePolicy } from '../infra/resilience';
import { Logger } from '../infra/Logger';
import { LLMParsingError, LLMError, LLMRateLimitError, LLMConnectionError, LLMQuotaExceededError } from '../types/exceptions';
import type { CorrelationId } from '../types/mas';

// Modified getCompletion
public async getCompletion(
  prompt: string,
  modelConfig?: ModelConfig,
  correlationId?: CorrelationId // Accept correlation ID for structured logging
): Promise<string> {
  const logger = Logger.getInstance();

  // A helper that makes the actual SDK call and maps errors
  const wrappedOperation = async () => {
    try {
      // The original SDK call (from Story 1.1)
      const response = await this.genAI.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          temperature: modelConfig?.temperature,
          maxOutputTokens: modelConfig?.maxOutputTokens,
        },
      });

      const text = response.text;
      if (!text) {
        throw new LLMParsingError('LLM returned an empty response.');
      }
      return text;
    } catch (error: unknown) {
      // Step 1: Map external error to internal application exception
      throw this.mapSDKErrorToException(error);
    }
  };

  try {
    // Step 2: Execute operation within library's resilience policy (CB -> Retry -> wrappedOperation)
    return await llmResiliencePolicy.execute(wrappedOperation);
  } catch (error) {
    // Step 3: Centralized Logging of final, terminal failure
    if (error instanceof MASError) {
       logger.log({ level: 'error', message: error.message, correlationId, code: error.code, data: error.originalError });
    } else if (error.name === 'CircuitBreakerOpenError') {
       logger.log({ level: 'error', message: `LLM Circuit is OPEN: ${error.message}`, correlationId, code: 'CIRCUIT_BREAKER_OPEN' });
    } else {
       logger.log({ level: 'error', message: `Unexpected terminal error: ${error}`, correlationId });
    }
    throw error; // Standardized, terminal error re-throw
  }
}

private mapSDKErrorToException(error: unknown): LLMError {
    // Step 1: Inspection of `error` (e.g., from @google/genai SDK) to determine the type
    // Step 2: Standardize: Return a specific application exception (LLMRateLimitError, LLMQuotaExceededError, etc.)
    // Ensure all internal exceptions are transient-aware (isTransient flag).
}
```

### 5.2 Update `lib/mas/core/Agent.ts`

The base `Agent` is updated to propagate correlation IDs in its messages, facilitating distributed tracing. Standardized logging and terminal error handling are added to its `process` method.

1.  **Trace Propagation:** In `sendMessage`, inject the active correlation ID into the message metadata. This ID is retrieved from the `Logger` singleton.
2.  **Add Centralized Logging:** Modify the `Agent.process` method to log startup and structured output.
3.  **Robust Error Handling:** Wrap the entire `Agent.process` method in a `try...catch` block. Terminal errors must be logged using the Centralized Logger before being re-thrown. The agent's state must be updated to `FAILURE`.

**Agent Pseudocode:**

```typescript
// Modified process method
public async process(request: AgentRequest): Promise<AgentResponse> {
  const logger = Logger.getInstance();

  // Set the correlation ID for this processing loop, if available in request meta
  const correlationId = request.payload.meta?.correlationId;
  if (correlationId) {
    logger.setCorrelationId(correlationId);
  }

  this._state = AgentState.WORKING;

  logger.log({
    level: 'info',
    message: `[Agent: ${this.name}] Starting task.`,
    agentName: this.name,
    agentState: this._state,
    correlationId: correlationId,
    data: request.payload.data,
  });

  try {
    // Overridden by concrete agents (will be added in later stories)
    // const result = await this.performTaskLogic(request);
    // return this.createSuccessResponse(request, result);

    // Original (and to remain for now) return
    throw new MASInternalError('Agent.process not implemented in base class.');

  } catch (error: unknown) {
    this._state = AgentState.FAILURE;

    // Step 1: Centralized Logging of failure
    logger.log({
      level: 'error',
      message: `[Agent: ${this.name}] Task failed. Error: ${error instanceof Error ? error.message : error}`,
      agentName: this.name,
      agentState: this._state,
      correlationId: correlationId,
      code: (error as MASError)?.code,
      data: (error as MASError)?.originalError,
    });

    // Step 2: Propagate terminal error
    throw error;
  }
}

protected async sendMessage<T>(
  to: string,
  payload: AgentMessagePayload<T>,
): Promise<void> {
  const logger = Logger.getInstance();
  const correlationId = logger.getCorrelationId(); // Get active ID

  const message: AgentMessage<T> = {
    id: crypto.randomUUID(),
    from: this.name,
    to: to,
    payload: {
      ...payload,
      meta: {
        ...payload.meta,
        correlationId, // Step 1: Inject trace info for propagation
      }
    },
    state: this._state,
    timestamp: new Date(),
  };

  // Original (and to remain for now) console log
  console.log(
    `[Agent: ${this.name}] Sending message:`,
    JSON.stringify(message, null, 2),
  );

  // structured log
  logger.log({ level: 'info', message: `[Agent: ${this.name}] Sending message to ${to}.`, agentName: this.name, correlationId, data: message });
}
```

### 5.3 Update `lib/mas/core/Supervisor.ts`

The `Supervisor` is the entry point and must manage the initial creation of correlation IDs and provide structured logging for the entire workflow. A new standardized orchestration method is added.

1.  **Add `orchestrate` helper:** Provide a standard concrete method in the base `Supervisor` to execute a concrete workflow. This method handles trace management, centralized logging (start/stop), and standardized terminal error handling.
2.  **Orchestration Logic:** The placeholder remains, but concrete supervisor workflows will call `this.orchestrate`.

**Supervisor Pseudocode:**

```typescript
public async orchestrate<TInput, TOutput>(
  workflowName: string,
  input: TInput,
  workflowLogic: (correlationId: CorrelationId) => Promise<TOutput>
): Promise<TOutput> {
  const logger = Logger.getInstance();

  // 1. Trace management
  let correlationId = logger.getCorrelationId();
  if (!correlationId) {
    correlationId = logger.generateCorrelationId();
    logger.setCorrelationId(correlationId);
  }

  // 2. Logging start
  logger.log({
    level: 'info',
    message: `[Supervisor: ${this.name}] Starting workflow: ${workflowName}.`,
    correlationId: correlationId,
    data: input,
  });

  try {
    // 3. Execute concrete workflow logic (passed as a function)
    const result = await workflowLogic(correlationId);

    // 4. Logging success
    logger.log({
      level: 'info',
      message: `[Supervisor: ${this.name}] Workflow ${workflowName} completed successfully.`,
      correlationId: correlationId,
    });

    return result;

  } catch (error: unknown) {
    // 5. Centralized Logging of failure
    logger.log({
      level: 'error',
      message: `[Supervisor: ${this.name}] Workflow ${workflowName} failed. Error: ${error instanceof Error ? error.message : error}`,
      correlationId: correlationId,
      code: (error as MASError)?.code,
      data: (error as MASError)?.originalError,
    });

    throw error; // Standardized, terminal error re-throw
  }
}
```

### 5.4 Update `lib/mas/index.ts`

Ensure all new types, classes, and utilities are re-exported.

```typescript
// lib/mas/index.ts

// Original Exports (for continuity)
export {
  AgentState,
  type AgentMessagePayload,
  type AgentMessage,
  type AgentRequest,
  type AgentResponse,
} from './types/mas';

export { LLMConnector, type ModelConfig } from './core/LLMConnector';
export { Agent } from './core/Agent';
export { Supervisor } from './core/Supervisor';

// --- STORY 1.2 NEW EXPORTS ---

// 1. Exception types
export {
  ChefcitoError,
  MASError,
  LLMError,
  LLMConnectionError,
  LLMRateLimitError,
  LLMQuotaExceededError,
  LLMParsingError,
  MASInternalError,
  CircuitBreakerOpenError, // Export Cockatiel error type
} from './types/exceptions';

// 2. Tracing types
export type { CorrelationId, AgentMessageMeta, LogEntry } from './types/mas';

// 3. Infrastructure
export { Logger } from './infra/Logger';
export { llmResiliencePolicy } from './infra/resilience'; // Export configured policy
```

## 6. Constraints & Decisions

This story implements critical infrastructure for MAS core, using the **cockatiel** library. The developer must adhere to the following constraints:

- [x] Strict TypeScript mode. No use of any.
- [x] MAS infrastructure classes: `Logger` (Singleton), `Resilience policies` (Configured in infra/resilience.ts).
- [x] Existing class updates: `Supervisor`, `Agent`, `LLMConnector`.
- [x] File and Directory Structure: New files under lib/mas/infra/ and lib/mas/types/exceptions.ts. All exports re-exported via lib/mas/index.ts.
- [x] Tracing and Correlation IDs: Trace management and propagation in all core components. Centralized structured logging (JSON format).
- [x] Error Mapping: Map transient SDK errors and terminal errors into MASError exceptions, which is used to drive cockatiel resilience decisions.
- [x] Tech stack decisions: **cockatiel** library usage is mandatory for robustness patterns (Retry, Circuit Breaker).
- [x] Verification checklist and acceptance criteria must be met.

## 7. Verification Checklist

Upon completion of the story, the following conditions must be met:

- [ ] The file structure is exactly as planned, with new infrastructure files under `lib/mas/infra/`.
- [ ] `npm run build` executes without any TypeScript errors, ensuring `cockatiel` is correctly imported and typed.
- [ ] The application-specific error hierarchy (`MASError` -> `LLMError` -> specific errors) is implemented.
- [ ] The `Logger` singleton correctly implements structured logging (JSON) with context (timestamp, level, correlation ID, agent details).
- [ ] Pre-defined Cockatiel policies for retry (exponential backoff) and circuit breaker are correctly configured and composed in `lib/mas/infra/resilience.ts`, tailored for LLM operations and specific error types.
- [ ] The `LLMConnector.getCompletion` method correctly integrates the composed `llmResiliencePolicy`. SDK errors are correctly mapped to internal exceptions. Terminal errors are logged.
- [ ] The base `Agent.process` method has standardized error handling and centralized logging. The `correlationId` is extracted from requests and propagated in new messages. The state is updated to `FAILURE` on error.
- [ ] The base `Supervisor` has a standard `orchestrate` helper that provides trace management, centralized logging, and standardized terminal error handling for concrete workflows.
- [ ] All new functionality is exported via `lib/mas/index.ts`.
