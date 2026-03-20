# Phase 1: Complete Backend & MAS Implementation

## Story 1.1: MAS Boilerplate & Types

## 1. Story Description
Establish the technical foundation of the Multi-Agent System (MAS). This involves defining the abstract base classes and interfaces that the `Supervisor` and all specialized `Agents` will inherit from, along with the core TypeScript types for inter-agent communication.

## 2. Components Involved
*   **Multi-Agent System (MAS):** Core architecture and types.
*   **LLMConnector:** Utility service.

## 3. Technical Considerations/Challenges
*   Designing generic and reusable base classes that can accommodate different agent types and task complexities.
*   Creating a robust type system for messages to prevent runtime errors during agent communication.

## 4. Expected Inputs
*   None.

## 5. Expected Outputs
*   A set of reusable TypeScript classes (`Supervisor`, `Agent`, `LLMConnector`).
*   Definition of core communication types (e.g., `AgentRequest`, `AgentResponse`, `SupervisorMessage`).

## 6. Specific Development Tasks
1.  **Define Core Types:**
    *   Create `types/mas.ts` for all MAS-related type definitions.
    *   Define `AgentState` enum (e.g., `IDLE`, `WORKING`, `SUCCESS`, `FAILURE`).
    *   Define `AgentMessage` interface (generic structure with `from`, `to`, `payload`, `state`).
    *   Define specialized request/response payloads for agents.
2.  **Implement `LLMConnector`:**
    *   Create a class (`mas/core/LLMConnector.ts`) with methods for initializing the LLM client, handling configuration (model, temperature), and a generic method for calling the LLM with a prompt.
3.  **Implement Abstract `Agent` Base Class:**
    *   Create an abstract class (`mas/core/Agent.ts`) with standard properties (`name`, `state`, `llmConnector`).
    *   Define an abstract `process` method that each concrete agent must implement to handle its specialized task.
4.  **Implement Abstract `Supervisor` Base Class:**
    *   Create an abstract class (`mas/core/Supervisor.ts`) that manages the overall task execution flow and holds references to the involved agents.
    *   Define abstract methods for orchestrating the multi-agent workflow for specific tasks.
