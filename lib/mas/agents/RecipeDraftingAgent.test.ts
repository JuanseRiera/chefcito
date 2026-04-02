import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentState } from '@/lib/mas/types/mas';
import type { AgentRequest } from '@/lib/mas/types/mas';
import type { DraftingAgentPayload } from '@/lib/mas/types/recipeCreation';

const { mockGetCompletion } = vi.hoisted(() => ({
  mockGetCompletion: vi.fn(),
}));

vi.mock('@/lib/mas/core/LLMConnector', () => ({
  LLMConnector: {
    getInstance: vi.fn().mockReturnValue({ getCompletion: mockGetCompletion }),
  },
}));

import { RecipeDraftingAgent } from './RecipeDraftingAgent';
import { LLMConnector } from '../core/LLMConnector';
import { LLMParsingError } from '../types/exceptions';

function makeRequest(payload: DraftingAgentPayload): AgentRequest {
  return {
    id: crypto.randomUUID(),
    from: 'supervisor',
    to: 'RecipeDraftingAgent',
    payload: { data: payload, meta: {} },
    state: AgentState.IDLE,
    timestamp: new Date(),
  };
}

function validOutput(overrides: object = {}) {
  return JSON.stringify({
    action: 'create_recipe',
    draft: {
      title: 'Test Cake',
      ingredients: [{ quantity: 1, unit: 'cup', name: 'flour', category: 'Pantry' }],
      instructionSteps: [{ stepNumber: 1, instruction: 'Mix.' }],
    },
    missingFields: [],
    questions: [],
    confidence: 0.9,
    sourceLanguage: 'en',
    safetyFlags: [],
    ...overrides,
  });
}

describe('RecipeDraftingAgent', () => {
  let agent: RecipeDraftingAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new RecipeDraftingAgent(LLMConnector.getInstance());
  });

  const defaultPayload: DraftingAgentPayload = {
    message: 'Test Cake: 1 cup flour. Mix and bake.',
    currentDraft: {},
    previousQuestions: [],
    conversationHistory: [],
    iterationCount: 0,
    appLanguage: 'en',
    sourceLanguage: null,
  };

  it('returns create_recipe action when LLM outputs a complete draft', async () => {
    mockGetCompletion.mockResolvedValue(validOutput());

    const response = await agent.process(makeRequest(defaultPayload));
    expect(response.payload.data).toMatchObject({ action: 'create_recipe', confidence: 0.9 });
    expect(response.state).toBe(AgentState.SUCCESS);
  });

  it('strips markdown code fences from LLM output', async () => {
    mockGetCompletion.mockResolvedValue('```json\n' + validOutput() + '\n```');

    const response = await agent.process(makeRequest(defaultPayload));
    expect(response.payload.data).toMatchObject({ action: 'create_recipe' });
  });

  it('returns ask_followup when draft is incomplete', async () => {
    mockGetCompletion.mockResolvedValue(
      validOutput({
        action: 'ask_followup',
        missingFields: ['steps'],
        questions: ['What are the steps?'],
        confidence: 0.4,
      }),
    );

    const response = await agent.process(makeRequest(defaultPayload));
    expect(response.payload.data).toMatchObject({
      action: 'ask_followup',
      missingFields: ['steps'],
    });
  });

  it('returns reject when message is malicious', async () => {
    mockGetCompletion.mockResolvedValue(
      validOutput({
        action: 'reject',
        safetyFlags: ['instructionOverride'],
        confidence: 0,
        reason: 'Injection attempt',
      }),
    );

    const response = await agent.process(makeRequest(defaultPayload));
    expect(response.payload.data).toMatchObject({ action: 'reject' });
  });

  it('throws LLMParsingError when LLM output is not valid JSON', async () => {
    mockGetCompletion.mockResolvedValue('not json at all');

    await expect(agent.process(makeRequest(defaultPayload))).rejects.toBeInstanceOf(LLMParsingError);
  });

  it('throws LLMParsingError when LLM output fails schema validation', async () => {
    mockGetCompletion.mockResolvedValue(JSON.stringify({ action: 'invalid_action' }));

    await expect(agent.process(makeRequest(defaultPayload))).rejects.toBeInstanceOf(LLMParsingError);
  });
});
