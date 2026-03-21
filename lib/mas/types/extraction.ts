import { z } from 'zod';

export const extractedIngredientSchema = z.object({
  quantity: z.number().nullable().describe('Floating point quantity'),
  unit: z
    .string()
    .nullable()
    .describe('Standardized measurement unit (e.g., "g", "cup", "tbsp")'),
  name: z.string().nonempty().describe('Ingredient name'),
  category: z
    .string()
    .nullable()
    .describe('Ingredient category (e.g., "Produce", "Dairy")'),
});

export const extractedInstructionStepSchema = z.object({
  stepNumber: z
    .number()
    .int()
    .positive()
    .describe('Integer step number, starting from 1'),
  instruction: z
    .string()
    .nonempty()
    .describe('Full instruction text for this step'),
});

export const extractedRecipeSchema = z.object({
  title: z.string().nonempty().describe('Recipe title'),
  description: z.string().nullable().describe('Short description or synopsis'),
  servings: z
    .number()
    .int()
    .nullable()
    .describe('Number of servings (integer)'),
  prepTime: z
    .number()
    .int()
    .nullable()
    .describe('Preparation time in minutes (integer)'),
  cookTime: z
    .number()
    .int()
    .nullable()
    .describe('Cooking time in minutes (integer)'),
  ingredients: z
    .array(extractedIngredientSchema)
    .nonempty()
    .describe('List of ingredients'),
  instructionSteps: z
    .array(extractedInstructionStepSchema)
    .nonempty()
    .describe('List of instruction steps'),
  author: z.string().nullable().describe('Recipe author (if known)'),
});

export type ExtractedIngredient = z.infer<typeof extractedIngredientSchema>;
export type ExtractedInstructionStep = z.infer<
  typeof extractedInstructionStepSchema
>;
export type ExtractedRecipe = z.infer<typeof extractedRecipeSchema>;

// --- Curation types ---

export const curationResultSchema = z.object({
  approved: z.boolean().describe('Whether the recipe passed quality review'),
  reason: z
    .string()
    .nonempty()
    .describe('Explanation for approval or rejection'),
  summary: z
    .string()
    .nullable()
    .describe('2-3 sentence summary of the dish (only when approved)'),
});

export type CurationResult = z.infer<typeof curationResultSchema>;

/** Recipe enriched with the curator's summary after approval. */
export interface CuratedRecipe extends ExtractedRecipe {
  summary: string;
}

// --- Payload types ---

export interface RecipeExtractionPayload {
  url: string;
  /** Optional feedback from a previous curation rejection to guide re-extraction. */
  rejectionFeedback?: string;
}

export interface RecipeCurationPayload {
  recipe: ExtractedRecipe;
}
