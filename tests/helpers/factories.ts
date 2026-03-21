import type {
  ExtractedRecipe,
  CuratedRecipe,
} from '@/lib/mas/types/extraction';

export function makeExtractedRecipe(
  overrides: Partial<ExtractedRecipe> = {},
): ExtractedRecipe {
  return {
    title: 'Test Chocolate Cake',
    description: 'A delicious test chocolate cake.',
    servings: 8,
    prepTime: 20,
    cookTime: 40,
    author: 'Test Chef',
    ingredients: [
      { quantity: 2, unit: 'cup', name: 'flour', category: 'Dry Goods' },
      { quantity: 1, unit: 'cup', name: 'sugar', category: 'Dry Goods' },
      {
        quantity: 100,
        unit: 'g',
        name: 'dark chocolate',
        category: 'Baking',
      },
    ],
    instructionSteps: [
      { stepNumber: 1, instruction: 'Preheat oven to 180°C.' },
      { stepNumber: 2, instruction: 'Mix dry ingredients.' },
      { stepNumber: 3, instruction: 'Bake for 40 minutes.' },
    ],
    ...overrides,
  };
}

export function makeCuratedRecipe(
  overrides: Partial<CuratedRecipe> = {},
): CuratedRecipe {
  return {
    ...makeExtractedRecipe(),
    summary: 'A rich and moist chocolate cake perfect for celebrations.',
    ...overrides,
  };
}

export function makeExtractedRecipeJson(
  overrides: Partial<ExtractedRecipe> = {},
): string {
  return JSON.stringify(makeExtractedRecipe(overrides));
}

export function makeCurationApprovedJson(summary?: string): string {
  return JSON.stringify({
    approved: true,
    reason: 'Recipe is complete and well-structured.',
    summary:
      summary ?? 'A rich and moist chocolate cake perfect for celebrations.',
  });
}

export function makeCurationRejectedJson(reason?: string): string {
  return JSON.stringify({
    approved: false,
    reason: reason ?? 'Missing preparation time.',
    summary: null,
  });
}
