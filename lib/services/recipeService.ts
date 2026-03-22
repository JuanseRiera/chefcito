import type { PrismaClient } from '@/prisma/generated/client';
import type { ExtractedRecipe, CuratedRecipe } from '../mas/types/extraction';
import { cache } from 'react';
import { getPrisma } from '../db/prisma';
import { Logger } from '../infra/Logger';
import { ChefcitoError } from '../types/exceptions';

const logger = Logger.getInstance();

export class RecipeService {
  constructor(private prisma: PrismaClient) {}
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

      const persistedRecipe = await this.prisma.recipe.create({
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
      const recipes = await this.prisma.recipe.findMany({
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
      const recipe = await this.prisma.recipe.findUnique({
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

export const getRecipeService = cache(() => new RecipeService(getPrisma()));
