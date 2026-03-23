import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentState } from '@/lib/mas/types/mas';
import type { AgentResponse } from '@/lib/mas/types/mas';
import type {
  ExtractedRecipe,
  CuratedRecipe,
} from '@/lib/mas/types/extraction';
import { makeExtractedRecipe } from '@/tests/helpers/factories';

// vi.hoisted ensures these are available when vi.mock factories run (hoisted).
const { mockGetCompletion, mockExtractionProcess, mockCurationProcess } =
  vi.hoisted(() => ({
    mockGetCompletion: vi.fn(),
    mockExtractionProcess: vi.fn(),
    mockCurationProcess: vi.fn(),
  }));

// Mock LLMConnector so RecipeSupervisor constructor doesn't call getInstance()
// against a real API key check (GEMINI_API_KEY=fake-... is set in .env.test,
// but mocking avoids the GoogleGenAI SDK initialization entirely).
vi.mock('@/lib/mas/core/LLMConnector', () => ({
  LLMConnector: {
    getInstance: vi.fn().mockReturnValue({
      getCompletion: mockGetCompletion,
    }),
  },
}));

// Mock agent classes with manual factories so their `name` property is correct.
// RecipeSupervisor registers agents by name (agent.name), so the mock objects
// must return the exact canonical name strings.
vi.mock('@/lib/mas/agents/RecipeExtractionAgent', () => ({
  RecipeExtractionAgent: function RecipeExtractionAgent() {
    return {
      name: 'RecipeExtractionAgent',
      process: mockExtractionProcess,
    };
  },
}));

vi.mock('@/lib/mas/agents/RecipeCuratorAgent', () => ({
  RecipeCuratorAgent: function RecipeCuratorAgent() {
    return {
      name: 'RecipeCuratorAgent',
      process: mockCurationProcess,
    };
  },
}));

import { RecipeSupervisor } from '@/lib/mas/RecipeSupervisor';

const TEST_URL = 'https://example.com/chocolate-cake';

function makeExtractionResponse(recipe: ExtractedRecipe): AgentResponse {
  return {
    id: crypto.randomUUID(),
    from: 'RecipeExtractionAgent',
    to: 'RecipeSupervisor',
    payload: { data: recipe, meta: {} },
    state: AgentState.SUCCESS,
    timestamp: new Date(),
  };
}

function makeCurationResponse(result: {
  approved: boolean;
  reason: string;
  summary: string | null;
}): AgentResponse {
  return {
    id: crypto.randomUUID(),
    from: 'RecipeCuratorAgent',
    to: 'RecipeSupervisor',
    payload: { data: result, meta: {} },
    state: AgentState.SUCCESS,
    timestamp: new Date(),
  };
}

describe('RecipeSupervisor', () => {
  let supervisor: RecipeSupervisor;

  beforeEach(() => {
    vi.clearAllMocks();
    supervisor = new RecipeSupervisor();
  });

  it('returns a CuratedRecipe when extraction and curation both succeed', async () => {
    const extracted = makeExtractedRecipe();
    mockExtractionProcess.mockResolvedValue(makeExtractionResponse(extracted));
    mockCurationProcess.mockResolvedValue(
      makeCurationResponse({
        approved: true,
        reason: 'Complete recipe',
        summary: 'A delicious chocolate cake.',
      }),
    );

    const result = await supervisor.runExtractionWorkflow(TEST_URL);

    expect(result).toMatchObject({
      title: extracted.title,
      summary: 'A delicious chocolate cake.',
    });
  });

  it('retries extraction with rejectionFeedback when curator rejects', async () => {
    const extracted = makeExtractedRecipe();
    mockExtractionProcess.mockResolvedValue(makeExtractionResponse(extracted));
    mockCurationProcess
      .mockResolvedValueOnce(
        makeCurationResponse({
          approved: false,
          reason: 'Missing cook time',
          summary: null,
        }),
      )
      .mockResolvedValueOnce(
        makeCurationResponse({
          approved: true,
          reason: 'Now complete',
          summary: 'Perfect cake.',
        }),
      );

    const result = await supervisor.runExtractionWorkflow(TEST_URL);

    expect(mockExtractionProcess).toHaveBeenCalledTimes(2);
    // Second extraction call should include the rejection feedback
    const secondCallPayload =
      mockExtractionProcess.mock.calls[1][0].payload.data;
    expect(secondCallPayload.rejectionFeedback).toBe('Missing cook time');
    expect((result as CuratedRecipe).summary).toBe('Perfect cake.');
  });

  it('returns the raw ExtractedRecipe when curation throws', async () => {
    const extracted = makeExtractedRecipe();
    mockExtractionProcess.mockResolvedValue(makeExtractionResponse(extracted));
    mockCurationProcess.mockRejectedValue(new Error('Curator service down'));

    const result = await supervisor.runExtractionWorkflow(TEST_URL);

    expect('summary' in result).toBe(false);
    expect(result.title).toBe(extracted.title);
  });

  it('returns last raw ExtractedRecipe after exhausting MAX_CURATION_RETRIES (3 attempts)', async () => {
    const extracted = makeExtractedRecipe();
    mockExtractionProcess.mockResolvedValue(makeExtractionResponse(extracted));
    mockCurationProcess.mockResolvedValue(
      makeCurationResponse({
        approved: false,
        reason: 'Always rejected',
        summary: null,
      }),
    );

    const result = await supervisor.runExtractionWorkflow(TEST_URL);

    // MAX_CURATION_RETRIES = 2, loop runs while attempt <= 2:
    // attempt increments to 1, 2, 3 before exiting. 3 extraction calls.
    expect(mockExtractionProcess).toHaveBeenCalledTimes(3);
    expect('summary' in result).toBe(false);
  });

  it('calls onProgress with fetching, extracting, and curating stages on the happy path', async () => {
    const extracted = makeExtractedRecipe();
    mockExtractionProcess.mockResolvedValue(makeExtractionResponse(extracted));
    mockCurationProcess.mockResolvedValue(
      makeCurationResponse({
        approved: true,
        reason: 'Good',
        summary: 'Summary.',
      }),
    );

    const stages: string[] = [];
    await supervisor.runExtractionWorkflow(TEST_URL, (stage) => {
      stages.push(stage);
    });

    expect(stages).toContain('fetching');
    expect(stages).toContain('extracting');
    expect(stages).toContain('curating');
  });

  it('calls onProgress with retrying stage on the second attempt', async () => {
    const extracted = makeExtractedRecipe();
    mockExtractionProcess.mockResolvedValue(makeExtractionResponse(extracted));
    mockCurationProcess
      .mockResolvedValueOnce(
        makeCurationResponse({
          approved: false,
          reason: 'Needs work',
          summary: null,
        }),
      )
      .mockResolvedValueOnce(
        makeCurationResponse({
          approved: true,
          reason: 'Good',
          summary: 'Done.',
        }),
      );

    const stages: string[] = [];
    await supervisor.runExtractionWorkflow(TEST_URL, (stage) => {
      stages.push(stage);
    });

    expect(stages).toContain('retrying');
  });

  it('propagates LLMParsingError thrown by the extraction agent', async () => {
    const { LLMParsingError } = await import('@/lib/mas/types/exceptions');
    mockExtractionProcess.mockRejectedValue(new LLMParsingError('Bad JSON'));

    await expect(
      supervisor.runExtractionWorkflow(TEST_URL),
    ).rejects.toBeInstanceOf(LLMParsingError);
  });
});
