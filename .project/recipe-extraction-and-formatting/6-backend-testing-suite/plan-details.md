# Phase 1: Complete Backend & MAS Implementation

## Story 1.5: Backend Testing Suite

## 1. Story Description

Create a comprehensive backend testing suite to ensure the reliability and correctness of the MAS, recipe extraction agent, and data persistence logic. This includes Unit Tests for individual agents, Integration Tests for Supervisor orchestration, and End-to-End (E2E) tests for the API endpoint.

## 2. Components Involved

- **Testing Framework:** (e.g., `vitest`).
- **MAS Core:** `Supervisor`, `Agent`, `LLMConnector`.
- **Recipe Extraction Agent:** `RecipeExtractionAgent`.
- **Next.js API Routes:** `/api/recipes/extract`.
- **Prisma Client & PostgreSQL (Test Database):** A dedicated, ephemeral database instance for integration and E2E testing.

## 3. Technical Considerations/Challenges

- **Mocking LLM Calls:** All unit and integration tests must strictly mock the `LLMConnector` and `Agent.process` methods.
- **Mocking Web Scraping:** Unit tests for the `RecipeExtractionAgent` should not perform live web requests.
- **Database Seeding & Cleanup:** Integration and E2E tests must have a reliable mechanism to reset/cleanup after each test run.
- **E2E Test Environment:** Setting up a consistent environment to run Next.js API routes and a test database.

## 4. Expected Inputs

- Existing codebase from all prior stories.

## 5. Expected Outputs

- A functional testing suite covering:
  - Unit Tests for `RecipeExtractionAgent`.
  - Integration Tests for `Supervisor`.
  - Unit/Integration Tests for `recipeService.ts`.
  - E2E Tests for `POST /api/recipes/extract`.
- Configured `npm test` script.

## 6. Specific Development Tasks

1.  **Configure Testing Environment:**
    - Install testing dependencies.
    - Create a `vitest.config.ts`.
    - Create a separate `.env.test` file.
2.  **Write Unit Tests for `RecipeExtractionAgent`:**
    - Mock `LLMConnector` and `fetchHtml` utility.
    - Test successful extraction, `ParsingError`, and security validation failure scenarios.
3.  **Write Integration Tests for `Supervisor`:**
    - Mock all agent classes and `LLMConnector`.
    - Test the orchestration flow for extraction.
4.  **Write Data Service Tests:**
    - Use the real test database instance.
    - Test successful recipe creation.
5.  **Write E2E Tests for API Route:**
    - Use the real test database.
    - Perform a POST request and verify HTTP 201 response and DB state.
