import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentState } from '@/lib/mas/types/mas';
import type { AgentRequest } from '@/lib/mas/types/mas';
import { LLMParsingError } from '@/lib/mas/types/exceptions';
import type { LLMConnector } from '@/lib/mas/core/LLMConnector';
import {
  makeExtractedRecipeJson,
  makeExtractedRecipe,
} from '../../helpers/factories';

vi.mock('@/lib/utils/fetchHtml', () => ({
  fetchHtml: vi.fn(),
}));
vi.mock('@/lib/utils/extractRecipeText', () => ({
  extractRecipeText: vi.fn(),
}));
vi.mock('@/lib/utils/sanitizePromptInjection', () => ({
  sanitizePromptInjection: vi.fn(),
}));
vi.mock('@/lib/mas/prompts/recipeParser', () => ({
  generateRecipeParsingPrompt: vi.fn().mockReturnValue('mocked-parsing-prompt'),
}));

import { fetchHtml } from '@/lib/utils/fetchHtml';
import { extractRecipeText } from '@/lib/utils/extractRecipeText';
import { sanitizePromptInjection } from '@/lib/utils/sanitizePromptInjection';
import { generateRecipeParsingPrompt } from '@/lib/mas/prompts/recipeParser';
import { RecipeExtractionAgent } from '@/lib/mas/agents/RecipeExtractionAgent';

const mockFetchHtml = vi.mocked(fetchHtml);
const mockExtractRecipeText = vi.mocked(extractRecipeText);
const mockSanitizePromptInjection = vi.mocked(sanitizePromptInjection);
const mockGeneratePrompt = vi.mocked(generateRecipeParsingPrompt);

function makeRequest(
  data: Record<string, unknown> = {},
  correlationId = 'test-correlation-id',
): AgentRequest {
  return {
    id: crypto.randomUUID(),
    from: 'TestSupervisor',
    to: 'RecipeExtractionAgent',
    payload: {
      data: { url: 'https://example.com/recipe', ...data },
      meta: { correlationId },
    },
    state: AgentState.IDLE,
    timestamp: new Date(),
  };
}

describe('RecipeExtractionAgent', () => {
  let mockLLM: { getCompletion: ReturnType<typeof vi.fn> };
  let agent: RecipeExtractionAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchHtml.mockResolvedValue('<html>...</html>');
    mockExtractRecipeText.mockReturnValue('Raw recipe text');
    mockSanitizePromptInjection.mockReturnValue('Sanitized recipe text');
    mockLLM = { getCompletion: vi.fn() };
    agent = new RecipeExtractionAgent(mockLLM as unknown as LLMConnector);
  });

  it('returns a SUCCESS response with the parsed recipe', async () => {
    mockLLM.getCompletion.mockResolvedValue(makeExtractedRecipeJson());

    const response = await agent.process(makeRequest());

    expect(response.state).toBe(AgentState.SUCCESS);
    expect(response.payload.data).toMatchObject({
      title: 'Test Chocolate Cake',
    });
  });

  it('calls fetchHtml with the URL and correlationId', async () => {
    mockLLM.getCompletion.mockResolvedValue(makeExtractedRecipeJson());

    await agent.process(makeRequest({}, 'my-corr-id'));

    expect(mockFetchHtml).toHaveBeenCalledWith(
      'https://example.com/recipe',
      'my-corr-id',
    );
  });

  it('pipes HTML through extractRecipeText and sanitizePromptInjection before LLM', async () => {
    mockLLM.getCompletion.mockResolvedValue(makeExtractedRecipeJson());

    await agent.process(makeRequest());

    expect(mockExtractRecipeText).toHaveBeenCalledWith(
      '<html>...</html>',
      'test-correlation-id',
    );
    expect(mockSanitizePromptInjection).toHaveBeenCalledWith(
      'Raw recipe text',
      'test-correlation-id',
    );
    expect(mockLLM.getCompletion).toHaveBeenCalledWith(
      'mocked-parsing-prompt',
      undefined,
      'test-correlation-id',
    );
  });

  it('passes rejectionFeedback to the prompt generator', async () => {
    mockLLM.getCompletion.mockResolvedValue(makeExtractedRecipeJson());

    await agent.process(
      makeRequest({ rejectionFeedback: 'Missing cook time' }),
    );

    expect(mockGeneratePrompt).toHaveBeenCalledWith(
      'Sanitized recipe text',
      'Missing cook time',
    );
  });

  it('strips markdown code fences from LLM output before parsing', async () => {
    mockLLM.getCompletion.mockResolvedValue(
      '```json\n' + makeExtractedRecipeJson() + '\n```',
    );

    const response = await agent.process(makeRequest());

    expect(response.state).toBe(AgentState.SUCCESS);
    expect(response.payload.data).toMatchObject({
      title: 'Test Chocolate Cake',
    });
  });

  it('throws LLMParsingError when LLM returns non-JSON text', async () => {
    mockLLM.getCompletion.mockResolvedValue('this is not valid JSON');

    await expect(agent.process(makeRequest())).rejects.toBeInstanceOf(
      LLMParsingError,
    );
  });

  it('throws LLMParsingError when JSON does not satisfy the schema', async () => {
    mockLLM.getCompletion.mockResolvedValue(JSON.stringify({ wrong: 'shape' }));

    await expect(agent.process(makeRequest())).rejects.toBeInstanceOf(
      LLMParsingError,
    );
  });

  it('throws LLMParsingError when ingredients array is empty (nonempty schema)', async () => {
    const invalid = {
      ...makeExtractedRecipe(),
      ingredients: [],
    };
    mockLLM.getCompletion.mockResolvedValue(JSON.stringify(invalid));

    await expect(agent.process(makeRequest())).rejects.toBeInstanceOf(
      LLMParsingError,
    );
  });

  it('propagates errors thrown by fetchHtml', async () => {
    mockFetchHtml.mockRejectedValue(new Error('HTTP 503'));

    await expect(agent.process(makeRequest())).rejects.toThrow('HTTP 503');
  });
});
