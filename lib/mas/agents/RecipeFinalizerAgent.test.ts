import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentState } from '@/lib/mas/types/mas';
import type { AgentRequest } from '@/lib/mas/types/mas';
import type { FinalizerAgentPayload } from '@/lib/mas/types/recipeCreation';

const { mockGetCompletion } = vi.hoisted(() => ({
  mockGetCompletion: vi.fn(),
}));

vi.mock('@/lib/mas/core/LLMConnector', () => ({
  LLMConnector: {
    getInstance: vi.fn().mockReturnValue({ getCompletion: mockGetCompletion }),
  },
}));

import { RecipeFinalizerAgent } from './RecipeFinalizerAgent';
import { LLMConnector } from '../core/LLMConnector';
import { LLMParsingError } from '../types/exceptions';

function makeRequest(payload: FinalizerAgentPayload): AgentRequest {
  return {
    id: crypto.randomUUID(),
    from: 'supervisor',
    to: 'RecipeFinalizerAgent',
    payload: { data: payload, meta: {} },
    state: AgentState.IDLE,
    timestamp: new Date(),
  };
}

function validOutput(overrides: object = {}) {
  return JSON.stringify({
    recipe: {
      language: 'en',
      title: 'Chocolate Chip Cookies',
      description: 'Classic cookies with chocolate chips.',
      servings: 12,
      prepTime: 15,
      cookTime: 10,
      author: null,
      originalUrl: null,
      ingredients: [
        { quantity: 2, unit: 'cup', name: 'flour', category: 'Pantry' },
      ],
      instructionSteps: [{ stepNumber: 1, instruction: 'Mix and bake.' }],
    },
    confidence: 0.95,
    normalizationWarnings: [],
    ...overrides,
  });
}

describe('RecipeFinalizerAgent', () => {
  let agent: RecipeFinalizerAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new RecipeFinalizerAgent(LLMConnector.getInstance());
  });

  const defaultPayload: FinalizerAgentPayload = {
    draft: {
      title: 'chocolate chip cookies',
      ingredients: [{ quantity: 2, unit: 'cup', name: 'flour', category: 'Pantry' }],
      instructionSteps: [{ stepNumber: 1, instruction: 'Mix and bake.' }],
    },
    sourceLanguage: 'en',
    appLanguage: 'en',
  };

  it('returns finalized recipe with generated description', async () => {
    mockGetCompletion.mockResolvedValue(validOutput());

    const response = await agent.process(makeRequest(defaultPayload));
    const output = response.payload.data as { recipe: { description: string }; confidence: number };
    expect(output.recipe.description).toBeTruthy();
    expect(output.confidence).toBe(0.95);
    expect(response.state).toBe(AgentState.SUCCESS);
  });

  it('strips markdown code fences from LLM output', async () => {
    mockGetCompletion.mockResolvedValue('```json\n' + validOutput() + '\n```');

    const response = await agent.process(makeRequest(defaultPayload));
    expect(response.payload.data).toMatchObject({ confidence: 0.95 });
  });

  it('throws LLMParsingError when LLM output is not valid JSON', async () => {
    mockGetCompletion.mockResolvedValue('not valid json');

    await expect(agent.process(makeRequest(defaultPayload))).rejects.toBeInstanceOf(LLMParsingError);
  });

  it('throws LLMParsingError when recipe is missing required fields', async () => {
    mockGetCompletion.mockResolvedValue(
      JSON.stringify({ recipe: { title: 'No ingredients' }, confidence: 0.5, normalizationWarnings: [] }),
    );

    await expect(agent.process(makeRequest(defaultPayload))).rejects.toBeInstanceOf(LLMParsingError);
  });
});
