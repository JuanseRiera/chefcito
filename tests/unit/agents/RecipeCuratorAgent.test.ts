import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentState } from '@/lib/mas/types/mas';
import type { AgentRequest } from '@/lib/mas/types/mas';
import { LLMParsingError } from '@/lib/mas/types/exceptions';
import type { LLMConnector } from '@/lib/mas/core/LLMConnector';
import type { CurationResult } from '@/lib/mas/types/extraction';
import {
  makeExtractedRecipe,
  makeCurationApprovedJson,
  makeCurationRejectedJson,
} from '../../helpers/factories';

vi.mock('@/lib/mas/prompts/recipeCurator', () => ({
  generateRecipeCurationPrompt: vi
    .fn()
    .mockReturnValue('mocked-curation-prompt'),
}));

import { RecipeCuratorAgent } from '@/lib/mas/agents/RecipeCuratorAgent';

function makeRequest(): AgentRequest {
  return {
    id: crypto.randomUUID(),
    from: 'TestSupervisor',
    to: 'RecipeCuratorAgent',
    payload: {
      data: { recipe: makeExtractedRecipe() },
      meta: { correlationId: 'test-correlation-id' },
    },
    state: AgentState.IDLE,
    timestamp: new Date(),
  };
}

describe('RecipeCuratorAgent', () => {
  let mockLLM: { getCompletion: ReturnType<typeof vi.fn> };
  let agent: RecipeCuratorAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLLM = { getCompletion: vi.fn() };
    agent = new RecipeCuratorAgent(mockLLM as unknown as LLMConnector);
  });

  it('returns a SUCCESS response with approved=true and summary', async () => {
    mockLLM.getCompletion.mockResolvedValue(
      makeCurationApprovedJson('A great cake.'),
    );

    const response = await agent.process(makeRequest());

    expect(response.state).toBe(AgentState.SUCCESS);
    const result = response.payload.data as CurationResult;
    expect(result.approved).toBe(true);
    expect(result.summary).toBe('A great cake.');
  });

  it('returns a SUCCESS response with approved=false and rejection reason', async () => {
    mockLLM.getCompletion.mockResolvedValue(
      makeCurationRejectedJson('Missing ingredient quantities'),
    );

    const response = await agent.process(makeRequest());

    const result = response.payload.data as CurationResult;
    expect(result.approved).toBe(false);
    expect(result.reason).toBe('Missing ingredient quantities');
    expect(result.summary).toBeNull();
  });

  it('strips markdown code fences from LLM output before parsing', async () => {
    mockLLM.getCompletion.mockResolvedValue(
      '```json\n' + makeCurationApprovedJson() + '\n```',
    );

    const response = await agent.process(makeRequest());

    expect(response.state).toBe(AgentState.SUCCESS);
  });

  it('throws LLMParsingError when LLM returns non-JSON text', async () => {
    mockLLM.getCompletion.mockResolvedValue('definitely not JSON');

    await expect(agent.process(makeRequest())).rejects.toBeInstanceOf(
      LLMParsingError,
    );
  });

  it('throws LLMParsingError when JSON does not match curation schema', async () => {
    mockLLM.getCompletion.mockResolvedValue(JSON.stringify({ status: 'ok' }));

    await expect(agent.process(makeRequest())).rejects.toBeInstanceOf(
      LLMParsingError,
    );
  });
});
