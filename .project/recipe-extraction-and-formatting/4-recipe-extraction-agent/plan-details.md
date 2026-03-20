# Phase 1: Complete Backend & MAS Implementation

## Story 1.3: Advanced Recipe Extraction & Formatting Agent

## 1. Story Description
Implement the concrete `RecipeExtractionAgent`. Responsible for fetching a recipe URL and using the LLM (via `LLMConnector`) to parse and format the text into a structured JSON object, including **Ingredient Categorization**, **Measurement Standardization**, and **Security Validations** to prevent prompt injection.

## 2. Components Involved
*   **MAS Agent:** `RecipeExtractionAgent`.
*   **LLMConnector:** Utilized for all LLM interactions.
*   **External Service:** Web scraping utility.

## 3. Technical Considerations/Challenges
*   **Token Management:** Efficient scraping and text extraction.
*   **Prompt Engineering & Security (Prompt Injection):** Creating prompts that are resilient to adversarial content found on external pages. Techniques include strict delimiters, clear instruction/data separation, few-shot adversarial examples, and enforcing a rigid JSON output schema.
*   **Categorization & Standardization Logic:** Robust parsing strategies.
*   **Output Consistency:** Ensuring reliable, schema-valid JSON.

## 4. Expected Inputs
*   Recipe URL (string).

## 5. Expected Outputs
*   Structured, formatted Recipe object (matches Prisma schema: Title, Ingredients \[categorized, standardizedquantity/unit/name], Instructions, Servings, PrepTime, CookTime, OriginalUrl, Author).

## 6. Specific Development Tasks
1.  **Create `mas/agents/RecipeExtractionAgent.ts`:** Define the class inheriting from base `Agent`.
2.  **Implement URL Fetching:** Create utility (`utils/fetchHtml.ts`) with error handling.
3.  **Implement Preprocessing:** Create utility (`utils/extractRecipeText.ts`) to isolate relevant text.
4.  **Develop **Secure** LLM Prompts:** Create `prompts/recipeParser.ts`:
    *   Prompt 1 (Parsing): Use clear delimiters (e.g., `"""`) to separate instructions from scraped content. Use few-shot examples that include ignoring out-of-context text.
    *   Prompt 2 (Formatting): Apply categorization and standardization.
    *   Prompt 3 (Validation): Use a separate, simpler LLM call or a robust regex/Zod schema to validate the final output is clean JSON.
5.  **Implement `RecipeExtractionAgent.process`:** Orchestrate fetching, preprocessing, secure LLM calls, and final JSON schema validation. Handle `ParsingError` and security-related failures.
6.  **Integrate with Supervisor:** Connect the agent to the MAS.
