import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared ingredient / step schemas (re-used from extraction types shape)
// ---------------------------------------------------------------------------

export const draftIngredientSchema = z.object({
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  name: z.string().min(1),
  category: z.string().nullable(),
});

export const draftInstructionStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  instruction: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Working draft — partial recipe accumulated across turns
// ---------------------------------------------------------------------------

export const workingDraftSchema = z.object({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  servings: z.number().int().nullable().optional(),
  prepTime: z.number().int().nullable().optional(),
  cookTime: z.number().int().nullable().optional(),
  author: z.string().nullable().optional(),
  originalUrl: z.string().nullable().optional(),
  ingredients: z.array(draftIngredientSchema).optional(),
  instructionSteps: z.array(draftInstructionStepSchema).optional(),
});

export type WorkingDraft = z.infer<typeof workingDraftSchema>;

// ---------------------------------------------------------------------------
// DraftingAgent output
// ---------------------------------------------------------------------------

export const draftingAgentOutputSchema = z.object({
  action: z.enum(['ask_followup', 'create_recipe', 'reject']),
  draft: workingDraftSchema,
  missingFields: z.array(z.string()),
  questions: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  sourceLanguage: z.string(),
  safetyFlags: z.array(z.string()),
  reason: z.string().optional(),
});

export type DraftingAgentOutput = z.infer<typeof draftingAgentOutputSchema>;

// ---------------------------------------------------------------------------
// FinalizerAgent output
// ---------------------------------------------------------------------------

export const finalizerRecipeSchema = z.object({
  language: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  servings: z.number().int().nullable(),
  prepTime: z.number().int().nullable(),
  cookTime: z.number().int().nullable(),
  author: z.string().nullable(),
  originalUrl: z.string().nullable(),
  ingredients: z.array(draftIngredientSchema).min(1),
  instructionSteps: z.array(draftInstructionStepSchema).min(1),
});

export type FinalizerRecipe = z.infer<typeof finalizerRecipeSchema>;

export const finalizerAgentOutputSchema = z.object({
  recipe: finalizerRecipeSchema,
  confidence: z.number().min(0).max(1),
  normalizationWarnings: z.array(z.string()),
});

export type FinalizerAgentOutput = z.infer<typeof finalizerAgentOutputSchema>;

// ---------------------------------------------------------------------------
// Conversation history
// ---------------------------------------------------------------------------

export const conversationTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export type ConversationTurn = z.infer<typeof conversationTurnSchema>;

// ---------------------------------------------------------------------------
// Session model (raw SQL result shape)
// ---------------------------------------------------------------------------

export interface RecipeCreationSession {
  id: string;
  status: 'collecting' | 'ready_to_save' | 'completed' | 'abandoned';
  appLanguage: string;
  sourceLanguage: string | null;
  iterationCount: number;
  workingDraft: WorkingDraft;
  missingFields: string[];
  lastQuestions: string[];
  lastUserMessage: string | null;
  conversationHistory: ConversationTurn[];
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

// ---------------------------------------------------------------------------
// API request / response schemas
// ---------------------------------------------------------------------------

export const createFromTextRequestSchema = z.object({
  message: z.string().min(1).max(5000),
  sessionId: z.string().optional(),
  appLanguage: z.enum(['en', 'es']),
});

export type CreateFromTextRequest = z.infer<typeof createFromTextRequestSchema>;

export const createFromTextResponseSchema = z.object({
  status: z.enum(['asking_followup', 'recipe_created', 'rejected']),
  sessionId: z.string().optional(),
  messages: z.array(z.string()),
  recipeId: z.string().optional(),
});

export type CreateFromTextResponse = z.infer<typeof createFromTextResponseSchema>;

// ---------------------------------------------------------------------------
// Supervisor payload types
// ---------------------------------------------------------------------------

export interface DraftingAgentPayload {
  message: string;
  currentDraft: WorkingDraft;
  previousQuestions: string[];
  conversationHistory: ConversationTurn[];
  iterationCount: number;
  appLanguage: string;
  sourceLanguage: string | null;
}

export interface FinalizerAgentPayload {
  draft: WorkingDraft;
  sourceLanguage: string;
  appLanguage: string;
}
