# Implementation Plan: Story 2.3 - Recipe Read API (Backend)

## 1. Prerequisites: Dependency Installation

No new dependencies required. This story only modifies the existing `RecipeService`.

## 2. File & Directory Structure

| File Path                       | Action   | Purpose                                                                   |
| :------------------------------ | :------- | :------------------------------------------------------------------------ |
| `lib/services/recipeService.ts` | Modified | Add `getAllRecipes()` and `getRecipeById()` methods to the existing class |

## 3. Existing Code Context

The file `lib/services/recipeService.ts` currently contains:

```typescript
import type { ExtractedRecipe, CuratedRecipe } from '../mas/types/extraction';
import { prisma } from '../db/prisma';
import { Logger } from '../infra/Logger';
import { ChefcitoError } from '../types/exceptions';

const logger = Logger.getInstance();

export class RecipeService {
  async createRecipe(
    recipeData: ExtractedRecipe | CuratedRecipe,
    originalUrl: string,
  ) {
    // ... existing implementation (do not modify)
  }
}

export const recipeService = new RecipeService();
```

**Logger API** — the `Logger.getInstance()` returns a singleton with a `log()` method:

```typescript
logger.log({
  timestamp: '',       // Empty string — Logger fills this
  level: 'info',       // 'info' | 'warn' | 'error'
  message: string,     // Log message
  data?: unknown,      // Optional structured data
});
```

**ChefcitoError constructor:** `new ChefcitoError(message: string, code: string)`

**Prisma schema field names** (from `prisma/schema.prisma`):

- Recipe: `id`, `title`, `description`, `originalUrl`, `author`, `isFormatted`, `servings`, `prepTime`, `cookTime`, `createdAt`, `updatedAt`
- Ingredient: `id`, `recipeId`, `quantity` (Float?), `unit` (String?), `name`, `category` (String?)
- InstructionStep: `id`, `recipeId`, `stepNumber` (Int), `instruction`

## 4. Implementation: Full Updated File

The complete `lib/services/recipeService.ts` after modification. The existing `createRecipe` method is unchanged — only two new methods are added.

```typescript
import type { ExtractedRecipe, CuratedRecipe } from '../mas/types/extraction';
import { prisma } from '../db/prisma';
import { Logger } from '../infra/Logger';
import { ChefcitoError } from '../types/exceptions';

const logger = Logger.getInstance();

export class RecipeService {
  /**
   * Persists an extracted/curated recipe to the database with all relations.
   * Uses an atomic nested create for transactional integrity.
   */
  async createRecipe(
    recipeData: ExtractedRecipe | CuratedRecipe,
    originalUrl: string,
  ) {
    logger.log({
      timestamp: '',
      level: 'info',
      message: `[RecipeService] Persisting recipe: ${recipeData.title}`,
      data: { title: recipeData.title, url: originalUrl },
    });

    try {
      const isCurated = 'summary' in recipeData && recipeData.summary;

      const persistedRecipe = await prisma.recipe.create({
        data: {
          title: recipeData.title,
          description: isCurated
            ? (recipeData as CuratedRecipe).summary
            : recipeData.description,
          servings: recipeData.servings,
          prepTime: recipeData.prepTime,
          cookTime: recipeData.cookTime,
          originalUrl,
          author: recipeData.author,
          isFormatted: true,
          ingredients: {
            create: recipeData.ingredients.map((ing) => ({
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
              category: ing.category,
            })),
          },
          instructionSteps: {
            create: recipeData.instructionSteps.map((step) => ({
              stepNumber: step.stepNumber,
              instruction: step.instruction,
            })),
          },
        },
        include: {
          ingredients: true,
          instructionSteps: true,
        },
      });

      logger.log({
        timestamp: '',
        level: 'info',
        message: `[RecipeService] Recipe persisted successfully`,
        data: { recipeId: persistedRecipe.id },
      });

      return persistedRecipe;
    } catch (error) {
      logger.log({
        timestamp: '',
        level: 'error',
        message: `[RecipeService] Failed to persist recipe`,
        data: { error, title: recipeData.title },
      });
      throw new ChefcitoError(
        'Failed to save recipe to database',
        'PERSISTENCE_FAILED',
      );
    }
  }

  /**
   * Retrieves all recipes, ordered by creation date (newest first).
   * Includes ingredient count for card display on the home page.
   * Does NOT include full ingredient/instruction relations (use getRecipeById for that).
   */
  async getAllRecipes() {
    logger.log({
      timestamp: '',
      level: 'info',
      message: '[RecipeService] Fetching all recipes',
    });

    try {
      const recipes = await prisma.recipe.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { ingredients: true },
          },
        },
      });

      logger.log({
        timestamp: '',
        level: 'info',
        message: `[RecipeService] Retrieved ${recipes.length} recipes`,
      });

      return recipes;
    } catch (error) {
      logger.log({
        timestamp: '',
        level: 'error',
        message: '[RecipeService] Failed to fetch recipes',
        data: { error },
      });
      throw new ChefcitoError(
        'Failed to retrieve recipes from database',
        'QUERY_FAILED',
      );
    }
  }

  /**
   * Retrieves a single recipe by ID with all relations (ingredients + instruction steps).
   * Returns null if the recipe does not exist — the caller (Server Component)
   * is responsible for calling notFound() in that case.
   */
  async getRecipeById(id: string) {
    logger.log({
      timestamp: '',
      level: 'info',
      message: '[RecipeService] Fetching recipe by ID',
      data: { id },
    });

    try {
      const recipe = await prisma.recipe.findUnique({
        where: { id },
        include: {
          ingredients: true,
          instructionSteps: {
            orderBy: { stepNumber: 'asc' },
          },
        },
      });

      if (!recipe) {
        logger.log({
          timestamp: '',
          level: 'info',
          message: '[RecipeService] Recipe not found',
          data: { id },
        });
        return null;
      }

      logger.log({
        timestamp: '',
        level: 'info',
        message: '[RecipeService] Recipe retrieved successfully',
        data: { id, title: recipe.title },
      });

      return recipe;
    } catch (error) {
      logger.log({
        timestamp: '',
        level: 'error',
        message: '[RecipeService] Failed to fetch recipe by ID',
        data: { error, id },
      });
      throw new ChefcitoError(
        'Failed to retrieve recipe from database',
        'QUERY_FAILED',
      );
    }
  }
}

// Export a singleton instance
export const recipeService = new RecipeService();
```

## 5. Return Type Shapes

These are the Prisma-inferred return types. No custom type definitions are needed — the types are inferred from the Prisma `include` and `_count` clauses.

**`getAllRecipes()` returns:**

```typescript
Array<{
  id: string;
  title: string;
  description: string | null;
  originalUrl: string | null;
  author: string | null;
  isFormatted: boolean;
  servings: number | null;
  prepTime: number | null;
  cookTime: number | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { ingredients: number };
}>;
```

**`getRecipeById(id)` returns:**

```typescript
{
  id: string;
  title: string;
  description: string | null;
  originalUrl: string | null;
  author: string | null;
  isFormatted: boolean;
  servings: number | null;
  prepTime: number | null;
  cookTime: number | null;
  createdAt: Date;
  updatedAt: Date;
  ingredients: Array<{
    id: string;
    recipeId: string;
    quantity: number | null;
    unit: string | null;
    name: string;
    category: string | null;
  }>;
  instructionSteps: Array<{
    id: string;
    recipeId: string;
    stepNumber: number;
    instruction: string;
  }>;
} | null
```

## 6. Constraints & Decisions

- **No new API routes.** These methods are called directly by Server Components in the Next.js 16 App Router. Server Components can import and call Prisma-backed services without needing HTTP API routes.
- **Error handling pattern:** Both methods throw `ChefcitoError` on database failures, consistent with the existing `createRecipe` method. Error codes are strings (`'QUERY_FAILED'`).
- **Null vs throw for not-found:** `getRecipeById` returns `null` when no recipe is found. This is not an error — the calling Server Component will call `notFound()` from `next/navigation` to trigger the 404 page.
- **Instruction ordering:** `instructionSteps` are ordered by `stepNumber: 'asc'` in the Prisma query.
- **Ingredient ordering:** Not explicitly ordered — insertion order from extraction is preserved. The display component groups by category anyway.
- **`_count` for cards:** `getAllRecipes()` uses Prisma's `_count` aggregation instead of including full ingredient arrays. This avoids loading unnecessary data for card display.
- **Logging:** Follows the exact Logger pattern from `createRecipe` — `logger.log({ timestamp: '', level, message, data? })`.
- **No imports added:** The existing imports (`prisma`, `Logger`, `ChefcitoError`) are sufficient. No new imports are needed.

## 7. Verification Checklist

- [ ] `getAllRecipes()` method is added inside the `RecipeService` class (not outside it)
- [ ] `getRecipeById()` method is added inside the `RecipeService` class
- [ ] Existing `createRecipe()` method is completely unchanged
- [ ] `getAllRecipes()` calls `prisma.recipe.findMany` with `orderBy: { createdAt: 'desc' }`
- [ ] `getAllRecipes()` includes `_count: { select: { ingredients: true } }`
- [ ] `getRecipeById()` calls `prisma.recipe.findUnique` with `where: { id }`
- [ ] `getRecipeById()` includes `ingredients: true` relation
- [ ] `getRecipeById()` includes `instructionSteps` ordered by `stepNumber: 'asc'`
- [ ] `getRecipeById()` returns `null` for a nonexistent ID (does NOT throw)
- [ ] Both methods throw `ChefcitoError` with code `'QUERY_FAILED'` on database errors
- [ ] Both methods log at `info` level on start and success
- [ ] Both methods log at `error` level on database failure
- [ ] The exported `recipeService` singleton has access to the new methods (they are class methods, not standalone functions)
- [ ] No new imports were added — reuses existing `prisma`, `Logger`, `ChefcitoError`
- [ ] `npm run build` passes with zero errors
