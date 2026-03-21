# Phase 1: Complete Backend & MAS Implementation

## Story 1.4: API Endpoints & Persistence Integration

## 1. Story Description

Create the Next.js API Routes to expose the recipe extraction functionality to the outside world. This involves setting up the endpoint (e.g., `/api/recipes/extract`), integrating the `Supervisor` (orchestrating the `RecipeExtractionAgent`), and implementing the Prisma Data Services (`recipeService.ts`) to persist the fully processed and formatted recipe into PostgreSQL.

## 2. Components Involved

- **Next.js API Routes:** Controller layer.
- **MAS Supervisor:** Orchestration layer.
- **Data Services Layer (`recipeService.ts`):** Abstraction for Prisma/DB interactions.
- **Prisma Client & PostgreSQL:** Persistence layer.

## 3. Technical Considerations/Challenges

- **Error Mapping:** Translating internal MAS exceptions (`LLMRateLimitError`, `ParsingError`) into appropriate HTTP status codes and user-friendly JSON error responses.
- **Transaction Management:** Ensuring that recipe creation and associated ingredient/instruction step insertions occur atomically within a single database transaction using Prisma.
- **Asynchronous Operations:** Managing the long-running LLM/scraping process within an API route without blocking.

## 4. Expected Inputs

- HTTP POST request to `/api/recipes/extract` with a JSON body: `{ "url": "https://example.com/recipe" }`.

## 5. Expected Outputs

- HTTP 201 Created response with the newly created, structured Recipe JSON object (matching Prisma schema).
- HTTP 4xx/5xx Error responses with standard error payloads (`{ "error": "User-friendly message" }`).

## 6. Specific Development Tasks

1.  **Implement `recipeService.ts`:**
    - Create `services/recipeService.ts` with a method `createRecipe(recipeData: RecipeInput)`.
    - Use `prisma.recipe.create` with `include` to insert the Recipe, Ingredients, and InstructionSteps in a single atomic transaction.
2.  **Create API Route Handler (`app/api/recipes/extract/route.ts`):**
    - Implement an `async POST` function.
    - Validate the input URL from the request body.
    - Instantiate the **Supervisor** (or use a singleton/DI pattern).
    - Call `Supervisor.orchestrateExtraction(url)`.
3.  **Implement Error Handling in API Route:**
    - Use a global `try...catch` block.
    - Map `ParsingError` to HTTP 422 Unprocessable Entity.
    - Map `MASInternalError` / unexpected errors to HTTP 500 Internal Server Error.
    - Utilize the Centralized Logger to log the final request outcome.
4.  **Integrate Persistence:**
    - Call `recipeService.createRecipe` with the result from the Supervisor within the successful execution path.
    - Return the saved recipe data with HTTP 201.
