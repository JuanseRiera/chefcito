import { describe, it, expect, afterEach, afterAll } from 'vitest';
import { RecipeService } from '@/lib/services/recipeService';
import { prisma } from '@/lib/db/prisma';
import { ChefcitoError } from '@/lib/types/exceptions';
import {
  makeExtractedRecipe,
  makeCuratedRecipe,
} from '@/tests/helpers/factories';

// The global prisma singleton in lib/db/prisma.ts uses DATABASE_URL,
// which is set to chefcito_test by .env.test loaded in tests/setup.ts.

describe('RecipeService (integration)', () => {
  const service = new RecipeService();
  const TEST_URL = 'https://example.com/test-recipe';

  afterEach(async () => {
    await prisma.instructionStep.deleteMany();
    await prisma.ingredient.deleteMany();
    await prisma.recipe.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('persists an ExtractedRecipe and returns it with generated id', async () => {
    const recipe = makeExtractedRecipe();

    const result = await service.createRecipe(recipe, TEST_URL);

    expect(result.id).toBeDefined();
    expect(result.title).toBe(recipe.title);
    expect(result.originalUrl).toBe(TEST_URL);
    expect(result.author).toBe(recipe.author);
    expect(result.servings).toBe(recipe.servings);
  });

  it('persists all ingredients with correct fields', async () => {
    const recipe = makeExtractedRecipe();

    const result = await service.createRecipe(recipe, TEST_URL);

    expect(result.ingredients).toHaveLength(recipe.ingredients.length);
    expect(result.ingredients[0]).toMatchObject({
      name: recipe.ingredients[0].name,
      quantity: recipe.ingredients[0].quantity,
      unit: recipe.ingredients[0].unit,
      category: recipe.ingredients[0].category,
    });
  });

  it('persists all instruction steps with correct stepNumber and instruction', async () => {
    const recipe = makeExtractedRecipe();

    const result = await service.createRecipe(recipe, TEST_URL);

    const sorted = [...result.instructionSteps].sort(
      (a, b) => a.stepNumber - b.stepNumber,
    );
    expect(sorted).toHaveLength(recipe.instructionSteps.length);
    expect(sorted[0].stepNumber).toBe(1);
    expect(sorted[0].instruction).toBe(recipe.instructionSteps[0].instruction);
  });

  it('uses the curator summary as description for a CuratedRecipe', async () => {
    const curated = makeCuratedRecipe({
      summary: 'A wonderful celebration cake.',
    });

    const result = await service.createRecipe(curated, TEST_URL);

    expect(result.description).toBe('A wonderful celebration cake.');
  });

  it('uses the original description for an ExtractedRecipe', async () => {
    const extracted = makeExtractedRecipe({
      description: 'Original extraction description.',
    });

    const result = await service.createRecipe(extracted, TEST_URL);

    expect(result.description).toBe('Original extraction description.');
  });

  it('cascades delete to ingredients and steps when recipe is deleted', async () => {
    const recipe = makeExtractedRecipe();
    const result = await service.createRecipe(recipe, TEST_URL);

    await prisma.recipe.delete({ where: { id: result.id } });

    const ingredients = await prisma.ingredient.findMany({
      where: { recipeId: result.id },
    });
    const steps = await prisma.instructionStep.findMany({
      where: { recipeId: result.id },
    });
    expect(ingredients).toHaveLength(0);
    expect(steps).toHaveLength(0);
  });

  it('throws ChefcitoError on a database constraint violation', async () => {
    // Passing null as title violates the NOT NULL constraint on Recipe.title
    const badRecipe = makeExtractedRecipe({
      title: null as unknown as string,
    });

    await expect(
      service.createRecipe(badRecipe, TEST_URL),
    ).rejects.toBeInstanceOf(ChefcitoError);
  });
});
