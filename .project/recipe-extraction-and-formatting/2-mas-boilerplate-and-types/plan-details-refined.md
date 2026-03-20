# Implementation Plan: Story 1.1 - MAS Boilerplate & Types

## 1. File & Directory Structure

All new files will be created under the `lib/` directory, which is the designated location for non-route backend logic.

| File Path | Purpose |
| :--- | :--- |
| `lib/mas/types/mas.ts` | Central definition of all TypeScript types, interfaces, and enums used for multi-agent system communication and state management. |
| `lib/mas/core/LLMConnector.ts` | A singleton-like class to manage the connection to the Google Gemini LLM API, handle configuration, and expose a standard method for sending prompts. |
| `lib/mas/core/Agent.ts` | The abstract base class that defines the core properties and methods for all specialized agents (e.g., Recipe Extraction Agent). All concrete agents will inherit from this class. |
| `lib/mas/core/Supervisor.ts` | The abstract base class for the main orchestrator (the Supervisor). It manages agent registration, task flow control, and high-level error reporting. |
| `lib/mas/index.ts` | A central export file for the `mas` module, facilitating clean imports of types, core classes, and the `LLMConnector`. |

## 2. Type Definitions (`lib/mas/types/mas.ts`)

These definitions form the backbone of the multi-agent system's type safety. The design utilizes generics to ensure that payload types can be tailored to specific agent functionalities while maintaining a consistent overall structure.

### 2.1 Enums

#### `AgentState`
Defines the lifecycle and operational status of an agent.

```typescript
export enum AgentState {
  IDLE = 'IDLE',
  WORKING = 'WORKING',
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}
```

### 2.2 Interfaces

#### `AgentMessagePayload<T = unknown>`
A simple wrapper interface for the payload, designed to be easily extensible. The generic parameter `T` defaults to `unknown` for maximum safety.

```typescript
export interface AgentMessagePayload<T = unknown> {
  data: T;
  meta?: Record<string, unknown>; // For optional metadata
}
```

#### `AgentMessage<T = unknown>`
The core communication contract between agents and the supervisor. The generic `T` specifies the type of the payload's `data` field.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | A unique identifier (UUID) for the message, useful for tracing and logging. |
| `from` | `string` | The name of the sender agent (or 'Supervisor'). |
| `to` | `string` | The name of the recipient agent (or 'Supervisor'). |
| `payload` | `AgentMessagePayload<T>` | The generic payload containing the message data. |
| `state` | `AgentState` | The current state of the sender agent at the time of the message. |
| `timestamp` | `Date` | The timestamp when the message was created. |

```typescript
export interface AgentMessage<T = unknown> {
  id: string;
  from: string;
  to: string;
  payload: AgentMessagePayload<T>;
  state: AgentState;
  timestamp: Date;
}
```

### 2.3 Type Aliases

For semantic clarity, type aliases are used for standard request and response messages. These align with the planned interaction pattern between the Supervisor and its Agents.

*   **`AgentRequest<T>`**: The Supervisor's message *to* an Agent to initiate a task.
*   **`AgentResponse<T>`**: An Agent's message *back to* the Supervisor with the task result.

```typescript
// Type aliases for clarity
export type AgentRequest<T = unknown> = AgentMessage<T>;
export type AgentResponse<T = unknown> = AgentMessage<T>;
```

**Rationale for Design Decisions:**

1.  **Generics (`<T = unknown>`):** Using a generic type parameter for the payload data allows for strict typing in concrete agent implementations. For example, a `RecipeExtractionAgent` can define its response as `AgentResponse<ExtractedRecipe>`, making the code more readable and preventing type errors. The default to `unknown` forces the developer to explicitly cast the type when needed, promoting type safety over convenience.
2.  **`id`, `from`, `to`, `timestamp`:** These fields are essential for observability and debugging, allowing the system to log, trace, and audit the communication flow.
3.  **`AgentState` in `AgentMessage`:** Including the agent's state in every message allows the supervisor to make orchestration decisions based on the actual status of the agent.

## 3. `LLMConnector` Class Design (`lib/mas/core/LLMConnector.ts`)

The `LLMConnector` will act as a singular point of truth for interacting with the Google Gemini API, abstracting the complexity of the `@google/genai` library. For this story, it will be implemented with a simple static instance pattern to provide singleton-like access.

| Component | Specification |
| :--- | :--- |
| **Class Name** | `LLMConnector` |
| **Properties** | `private genAI: GoogleGenerativeAI`: The internal Gemini client instance.<br>`private modelName: string`: Name of the Gemini model to use (e.g., 'gemini-pro').<br>`private static instance: LLMConnector`: The single instance of the class for the singleton pattern. |
| **Constructor** | `private constructor()`: The constructor must be private to enforce the singleton pattern.<br>It is responsible for:<br>1. Reading `GEMINI_API_KEY` from `process.env`.<br>2. Throwing a robust error if the key is missing or invalid.<br>3. Initializing the `genAI` client. |
| **Methods** | `public static getInstance(): LLMConnector`: The standard method to retrieve the single class instance.<br>`public async getCompletion(prompt: string, modelConfig?: ModelConfig): Promise<string>`: A generic asynchronous method to send a prompt to the LLM and receive a text completion. It should handle errors from the LLM client and wrap them in application-specific errors. `ModelConfig` can be a small interface for parameters like temperature and max tokens. |

**Handling Missing API Key:**

The constructor must immediately throw a descriptive error (e.g., `new Error('Missing GEMINI_API_KEY environment variable. MAS initialization failed.')`) if the environment variable is not set. This prevents the application from starting in an unstable state and provides clear feedback to the developer.

## 4. Abstract `Agent` Base Class Design (`lib/mas/core/Agent.ts`)

This abstract base class encapsulates the state and behavior shared by all specialised agents. It forces concrete implementations to focus on their specific task via the abstract `process` method.

| Component | Specification |
| :--- | :--- |
| **Class Name** | `Agent` |
| **Constructor** | `constructor(public readonly name: string, protected llmConnector: LLMConnector)` |
| **Properties** | `protected _state: AgentState`: The current agent state, with `protected` access for subclasses and a public getter.<br>`public get state(): AgentState`: Public read-only access to the state. |
| **Methods** | `public abstract process(request: AgentRequest): Promise<AgentResponse>`: The core abstract method that *every* concrete agent must implement. It receives a generic request and must return a generic response.<br>`protected async sendMessage(to: string, payload: AgentMessagePayload): Promise<void>`: A concrete helper method that abstracts the creation of an `AgentMessage`, automatically handles fields like `id`, `from`, `state`, and `timestamp`, and then delegates the actual sending logic (which for this story can be a `console.log` placeholder). |

**Concrete Helper Method (`sendMessage`):**

The `sendMessage` method will significantly simplify the code for concrete agents, as they will only need to provide the recipient and the payload. This reduces code duplication and ensures consistency in message formatting across all agents.

```typescript
protected async sendMessage<T>(to: string, payload: AgentMessagePayload<T>): Promise<void> {
  const message: AgentMessage<T> = {
    id: crypto.randomUUID(), // Use a UUID library
    from: this.name,
    to: to,
    payload: payload,
    state: this._state,
    timestamp: new Date(),
  };

  // For Story 1.1, simply log the message
  console.log(`[Agent: ${this.name}] Sending message:`, JSON.stringify(message, null, 2));
  // Future implementation: this.supervisor.receiveMessage(message);
}
```

## 5. Abstract `Supervisor` Base Class Design (`lib/mas/core/Supervisor.ts`)

The abstract `Supervisor` class is the central point for MAS orchestration. It will provide the framework for managing agents and executing complex, multi-step workflows.

| Component | Specification |
| :--- | :--- |
| **Class Name** | `Supervisor` |
| **Constructor** | `constructor(public readonly name: string)` |
| **Properties** | `protected agents: Map<string, Agent>`: A map with agent names as keys and agent instances as values, ensuring `O(1)` access. |
| **Methods** | `public registerAgent(agent: Agent): void`: A concrete method to add an agent instance to the `agents` map. It should check for name collisions.<br>`public abstract runExtractionWorkflow(url: string): Promise<Recipe>`: An example abstract method demonstrating how specific workflows are forced upon concrete supervisor implementations (the `Recipe` type is already defined in Prisma). **This will not be implemented in this story.**<br>`public getAgent(name: string): Agent | undefined`: A concrete utility method to retrieve an agent by its name. |

## 6. Constraints & Decisions

The developer implementing this plan must adhere to the following strict constraints:

1.  **Strictly Out of Scope:** This story will **NOT** implement:
    *   Any concrete agent classes (e.g., `RecipeExtractionAgent`).
    *   Any concrete supervisor classes.
    *   Any Next.js API Routes or Server Actions.
    *   Any direct database access (Prisma).
    *   The placeholder `console.log` in `Agent.sendMessage` is acceptable for this initial boilerplate story.
2.  **TypeScript Strict Mode:** The project is in strict mode. The use of `any` is strictly forbidden. The `unknown` type should be preferred when the type is truly generic, and the developer should use type guards or casting only when necessary.
3.  **Naming Conventions:** All class names must be `PascalCase`, and all properties/methods must be `camelCase`. File names should be in `PascalCase` for classes (e.g., `Agent.ts`) and `camelCase` for others (e.g., `mas.ts`).
4.  **`LLMConnector` as Singleton:** The `LLMConnector` **must** be implemented with a private constructor and a static `getInstance()` method to control access to the LLM client and its configuration.
5.  **Environment Variables:** The `GEMINI_API_KEY` is a secret and **must never** be hardcoded. It is read from `process.env`. The `LLMConnector` should log a warning or error if it is not present.

## 7. Verification Checklist

Upon completion of the story, the following conditions must be met:

*   [ ] The file structure is exactly as planned.
*   [ ] `npm run build` executes without any TypeScript errors.
*   [ ] The `LLMConnector.ts` correctly reads `GEMINI_API_KEY` from `process.env` and throws an error if it's missing.
*   [ ] The `Agent` class has all planned abstract and concrete methods with correct access modifiers.
*   [ ] The `Supervisor` class can correctly register and retrieve an agent by name.
*   [ ] All abstract base classes (`Agent`, `Supervisor`) are correctly exported via the `lib/mas/index.ts` file.
