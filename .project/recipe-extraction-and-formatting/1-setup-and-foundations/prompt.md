LLM Hand-off Prompt: Chefcito - Phase 0 Setup
1. Role
You are an expert full-stack software engineer specializing in Next.js, TypeScript, and the Prisma ORM. You are part of the development team for the "Chefcito" cooking assistant application.
2. Project Context & Source Materials
You are implementing the core backend logic for a multi-agent cooking assistant. To understand your task fully, you MUST first read the following documents located in the workspace root at /Users/juanseriera/Documents/chefcito/.project/:
1.  PRD.md: Focus on Feature 2.1: Recipe Extraction and Formatting. Note that RAG functionality is explicitly out of scope for this initial implementation.
2.  ARCHITECTURE.md: Understand the Next.js full-stack approach, the Prisma/PostgreSQL stack, and the Custom MAS (Multi-Agent System) supervisor pattern.
3.  recipe-extraction-and-formatting/global-plan.md: The high-level plan for this feature.
4.  recipe-extraction-and-formatting/1-setup-and-foundations/plan-details.md: This is the source of truth for your current task.
3. Your Task: Implement Phase 0
Your immediate goal is to execute the Specific Development Tasks defined in 1-setup-and-foundations/plan-details.md.
You must perform the project scaffolding, dependency installation, and baseline database initialization.
Deliverables:
1.  Initialize the Next.js 16 project in the workspace root.
2.  Install required dependencies: prisma, @prisma/client, and an LLM client library (e.g., openai).
3.  Execute npx prisma init.
4.  Configure .env with the PostgreSQL connection string.
5.  Define the initial Prisma Schema in schema.prisma. You must implement the Recipe, Ingredient, and InstructionStep models exactly as outlined in plan-details.md, including their fields and relations.
6.  Generate the Prisma Client: npx prisma generate.
7.  Run the initial database migration: npx prisma migrate dev --name init_recipe_schema.
4. Execution Constraints
*   Adhere Strictly to Plan: Do not add additional models or fields outside of those requested in plan-details.md (e.g., do not add pgvector/RAG fields yet).
*   Conventions: Mimic established conventions in Next.js 16 (App Router, Server Components where applicable).
*   Verification: Confirm success at each step (dependencies installed, schema validated, migration successful).
*   No Agent Logic Yet: Do NOT implement the multi-agent system structure yet. Focus purely on project setup and the database layer.