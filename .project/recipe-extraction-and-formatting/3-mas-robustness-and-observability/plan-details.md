# Phase 1: Complete Backend & MAS Implementation

## Story 1.2: MAS Robustness & Observability

## 1. Story Description
Implement critical infrastructure components within the MAS core to ensure resilience and observability. This includes a generic **Retry Mechanism** for LLM calls, a **Circuit Breaker** pattern to protect against failing external services, a **Centralized Logger** for comprehensive execution tracing, and global error handling strategies managed by the Supervisor.

## 2. Components Involved
*   **MAS Core:** `Supervisor`, `Agent`, `LLMConnector` base classes and utilities.
*   **Infrastructure:** A dedicated `mas/infra` directory for these utilities.

## 3. Technical Considerations/Challenges
*   Designing generic retry and circuit breaker decorators/utilities that can be cleanly applied to various agent actions without significant code duplication.
*   Implementing an efficient Centralized Logger that provides sufficient detail for debugging (correlation IDs, timestamps, agent states) without introducing excessive performance overhead.
*   Defining a clear hierarchy of MAS-specific exceptions to distinguish between transient LLM errors, parsing failures, and systemic issues.

## 4. Expected Inputs
*   Existing abstract base classes from Story 1.1.

## 5. Expected Outputs
*   Functional `RetryDecorator` / utility.
*   Functional `CircuitBreaker` utility.
*   Functional `CentralizedLogger` service.
*   Updated base `Supervisor` and `Agent` classes utilizing these utilities.
*   Definition of MAS-specific exception types (`MASError`, `TransientLLMError`, `ParsingError`).

## 6. Specific Development Tasks
1.  **Implement Centralized Logger:**
    *   Create a singleton logger service (`mas/infra/Logger.ts`).
    *   Implement methods for logging with context (correlation ID for request, agent name, state).
2.  **Define Exception Types:**
    *   Create `types/exceptions.ts` defining base `ChefcitoError` and derived MAS errors (`MASInternalError`, `LLMRateLimitError`, `RecipeParsingError`).
3.  **Implement Retry Mechanism:**
    *   Create a utility function or decorator (`mas/infra/Retry.ts`).
    *   Implement logic for exponential backoff and maximum retry attempts, specifically targeting transient LLM errors.
4.  **Implement Circuit Breaker Pattern:**
    *   Create a utility (`mas/infra/CircuitBreaker.ts`).
    *   Implement logic to "trip" the circuit after repeated failures to an external LLM provider, preventing cascading failures.
5.  **Integrate with MAS Core:**
    *   Update `LLMConnector.process` to optionally wrap calls with the `RetryDecorator` and `CircuitBreaker`.
    *   Update `Agent.process` and `Supervisor.orchestrate` to utilize the `CentralizedLogger`.
    *   Implement global `try...catch` blocks in base classes to use the logger and standardize error responses.
