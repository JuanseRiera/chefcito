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
}

// Export a singleton instance
export const recipeService = new RecipeService();
