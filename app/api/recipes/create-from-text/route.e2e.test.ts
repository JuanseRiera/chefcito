import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CreateFromTextResponse } from '@/lib/mas/types/recipeCreation';

const { mockProcessTurn } = vi.hoisted(() => ({
  mockProcessTurn: vi.fn(),
}));

vi.mock('@/lib/mas/RecipeCreationSupervisor', () => ({
  RecipeCreationSupervisor: function RecipeCreationSupervisor() {
    return { processTurn: mockProcessTurn };
  },
}));

import { POST } from './route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/recipes/create-from-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/recipes/create-from-text', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('request validation', () => {
    it('returns 400 when message is missing', async () => {
      const response = await POST(makeRequest({ appLanguage: 'en' }));
      expect(response.status).toBe(400);
      const body = await response.json() as { error: string };
      expect(body.error).toContain('message');
    });

    it('returns 400 when message is empty', async () => {
      const response = await POST(makeRequest({ message: '', appLanguage: 'en' }));
      expect(response.status).toBe(400);
    });

    it('returns 400 when appLanguage is missing', async () => {
      const response = await POST(makeRequest({ message: 'some recipe' }));
      expect(response.status).toBe(400);
    });

    it('returns 400 when appLanguage is unsupported', async () => {
      const response = await POST(makeRequest({ message: 'recipe', appLanguage: 'fr' }));
      expect(response.status).toBe(400);
    });

    it('returns 400 when body is not valid JSON', async () => {
      const req = new Request('http://localhost/api/recipes/create-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      });
      const response = await POST(req);
      expect(response.status).toBe(400);
    });
  });

  describe('happy path', () => {
    it('returns 200 with recipe_created status', async () => {
      const supervisorResult: CreateFromTextResponse = {
        status: 'recipe_created',
        recipeId: 'recipe-abc',
        messages: ['Your recipe was saved!'],
      };
      mockProcessTurn.mockResolvedValue(supervisorResult);

      const response = await POST(
        makeRequest({ message: 'Cake: flour, eggs. Mix and bake.', appLanguage: 'en' }),
      );

      expect(response.status).toBe(200);
      const body = await response.json() as CreateFromTextResponse;
      expect(body.status).toBe('recipe_created');
      expect(body.recipeId).toBe('recipe-abc');
    });

    it('returns 200 with asking_followup status', async () => {
      const supervisorResult: CreateFromTextResponse = {
        status: 'asking_followup',
        sessionId: 'sess-abc',
        messages: ['What are the steps?'],
      };
      mockProcessTurn.mockResolvedValue(supervisorResult);

      const response = await POST(makeRequest({ message: 'Cake', appLanguage: 'en' }));

      expect(response.status).toBe(200);
      const body = await response.json() as CreateFromTextResponse;
      expect(body.status).toBe('asking_followup');
      expect(body.sessionId).toBe('sess-abc');
    });

    it('returns 200 with rejected status', async () => {
      const supervisorResult: CreateFromTextResponse = {
        status: 'rejected',
        messages: ['Not a recipe.'],
      };
      mockProcessTurn.mockResolvedValue(supervisorResult);

      const response = await POST(makeRequest({ message: 'test', appLanguage: 'es' }));

      expect(response.status).toBe(200);
      const body = await response.json() as CreateFromTextResponse;
      expect(body.status).toBe('rejected');
    });

    it('passes sessionId to supervisor when provided', async () => {
      mockProcessTurn.mockResolvedValue({ status: 'recipe_created', messages: ['Done!'] });

      await POST(
        makeRequest({ message: 'reply to question', sessionId: 'sess-xyz', appLanguage: 'en' }),
      );

      expect(mockProcessTurn).toHaveBeenCalledWith('reply to question', 'sess-xyz', 'en');
    });
  });

  describe('error handling', () => {
    it('returns 422 on LLMParsingError', async () => {
      const { LLMParsingError } = await import('@/lib/mas/types/exceptions');
      mockProcessTurn.mockRejectedValue(new LLMParsingError('Bad JSON'));

      const response = await POST(
        makeRequest({ message: 'some recipe', appLanguage: 'en' }),
      );

      expect(response.status).toBe(422);
    });

    it('returns 429 on LLMRateLimitError', async () => {
      const { LLMRateLimitError } = await import('@/lib/mas/types/exceptions');
      mockProcessTurn.mockRejectedValue(new LLMRateLimitError('rate limit'));

      const response = await POST(
        makeRequest({ message: 'some recipe', appLanguage: 'en' }),
      );

      expect(response.status).toBe(429);
    });

    it('returns 503 on CircuitBreakerOpenError', async () => {
      const { CircuitBreakerOpenError } = await import('@/lib/mas/types/exceptions');
      mockProcessTurn.mockRejectedValue(new CircuitBreakerOpenError('circuit open'));

      const response = await POST(
        makeRequest({ message: 'some recipe', appLanguage: 'en' }),
      );

      expect(response.status).toBe(503);
    });

    it('returns 500 on unexpected error', async () => {
      mockProcessTurn.mockRejectedValue(new Error('Unexpected'));

      const response = await POST(
        makeRequest({ message: 'some recipe', appLanguage: 'en' }),
      );

      expect(response.status).toBe(500);
    });
  });
});
