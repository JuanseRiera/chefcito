# Global Plan: Feature 2.1 - Recipe Extraction and Formatting

## 1. Goal
Enable robust extraction, formatting, and persistence of core recipe data (Title, Ingredients, Instructions, Original URL, Author) to PostgreSQL from a user-provided URL, using the Multi-Agent System (MAS).

## 2. Phased Approach

### Phase 0: Project Setup & Foundational Updates
*   Initialize Next.js and Prisma.
*   Define the initial database schema (`Recipe`, `Ingredient`, `InstructionStep`) and execute baseline migrations.

### Phase 1: Complete Backend & MAS Implementation (Backend Only)
*   Establish the MAS infrastructure, advanced agent logic, and data persistence.

*   **Story 1.1: MAS Boilerplate & Types:** Create base classes for Supervisor and Agent, standard LLMConnector, and message types.
*   **Story 1.2: MAS Robustness & Observability:** Implement generic **Retry**, **Circuit Breaker**, **Centralized Logger**, and global error handling strategies.
*   **Story 1.3: Advanced Recipe Extraction & Formatting Agent:** Implement LLM-based parsing, including **Ingredient Categorization**, **Measurement Standardization**, and **Prompt Injection Validations**.
*   **Story 1.4: API Endpoints & Persistence Integration:** Create Next.js API Routes (e.g., `/api/recipes/extract`) and integrate Prisma Data Services.
*   **Story 1.5: Backend Testing Suite:** Implement Unit, Integration, and E2E tests.

### Phase 2: Frontend & UX Polish (Mobile-First)
*   Develop a responsive, Mobile-First user interface.
*   Deliver React components for URL input and recipe display (Server Components), loading states, and user-friendly error displays.

## 3. Critical First Steps
1.  Define the initial Prisma schema and run migrations.
2.  Scaffold the base MAS infrastructure classes.
3.  Implement the Centralized Logger and Robustness patterns.

## 4. Success Metrics
*   **Extraction Success Rate:** Target 85%+ on valid cooking URLs.
*   **MAS Stability & Observability:** Logs confirm successful operation and utilisation of retry/circuit breaker mechanisms.
*   **Testing Coverage:** Verified backend test coverage.

## 5. Out of Scope (For this feature)
**Integration with pgvector and the RAG system is explicitly out of scope for Feature 2.1** and will be implemented in the immediately following feature.
