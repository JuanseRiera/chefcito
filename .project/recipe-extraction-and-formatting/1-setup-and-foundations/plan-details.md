# Phase 0: Project Setup & Foundational Updates

## 1. Description
Perform the necessary project scaffolding, dependency installation, and baseline database initialization to support the MAS and recipe extraction logic.

## 2. Components Involved
*   **Next.js Scaffold:** Backend (API Routes) will be focused on first.
*   **Prisma ORM:** Used for data access.
*   **PostgreSQL:** Relational Database to store structured recipe data.

## 3. Inputs
*   User request for project initialization.

## 4. Outputs
*   Functional Next.js backend structure.
*   Prisma client generated.
*   Base database schema and first migration executed.

## 5. Specific Development Tasks
1.  Initialize Next.js 16 project (TypeScript, App Router, ESLint, Tailwind CSS). (Assuming some of this is complete but needs validation).
2.  Install required dependencies: `prisma`, `@prisma/client`, and LLM client library (e.g., `@langchain/openai`, `openai`).
3.  Execute `npx prisma init` to set up Prisma.
4.  Configure `.env` with the PostgreSQL connection string.
5.  **Define the initial Prisma Schema** in `schema.prisma`:
    *   Create a `Recipe` model (fields: `id`, `title`, `description`, `originalUrl`, `author`, `isFormatted`, `servings`, `prepTime`, `cookTime`, `createdAt`, `updatedAt`).
    *   Create an `Ingredient` model (fields: `id`, `recipeId`, `quantity`, `unit`, `name`, `category`). Define relation to `Recipe`.
    *   Create an `InstructionStep` model (fields: `id`, `recipeId`, `stepNumber`, `instruction`). Define relation to `Recipe`.
6.  Generate the Prisma Client: `npx prisma generate`.
7.  Run the initial migration: `npx prisma migrate dev --name init_recipe_schema`.
