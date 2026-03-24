import { describe, it, expect, vi, afterEach, afterAll } from 'vitest';
import { getPrisma } from '@/lib/db/prisma';
import {
  makeCuratedRecipe,
  makeExtractedRecipe,
} from '@/tests/helpers/factories';
import {
  consumeSSEStream,
  type ParsedSSEEvent,
} from '@/tests/helpers/sseParser';
import {
  LLMParsingError,
  LLMRateLimitError,
  CircuitBreakerOpenError,
} from '@/lib/mas/types/exceptions';
import type { CuratedRecipe, ExtractedRecipe } from '@/lib/mas/types/extraction';

// vi.hoisted ensures mock fns are available when vi.mock factories run.
const { mockRunExtractionWorkflow, mockUploadImageFromUrl } = vi.hoisted(() => ({
  mockRunExtractionWorkflow: vi.fn(),
  mockUploadImageFromUrl: vi.fn(),
}));

// Mock RecipeSupervisor so no LLM calls are made.
// The E2E scope covers: request validation → SSE setup → persistence → event emission.
vi.mock('@/lib/mas/RecipeSupervisor', () => ({
  RecipeSupervisor: function RecipeSupervisor() {
    return { runExtractionWorkflow: mockRunExtractionWorkflow };
  },
}));

// Mock imageStorage so no real HTTP calls are made in E2E tests.
vi.mock('@/lib/infra/imageStorage', () => ({
  uploadImageFromUrl: mockUploadImageFromUrl,
}));

// Helper: wrap a recipe in the { recipe, imageUrl } shape the supervisor now returns.
function supervisorResult(
  recipe: CuratedRecipe | ExtractedRecipe,
  imageUrl: string | null = null,
) {
  return { recipe, imageUrl };
}

// Import handler AFTER mocks are registered (Vitest hoists vi.mock calls).
import { POST } from '@/app/api/recipes/extract/route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/recipes/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function getEvent(
  events: ParsedSSEEvent[],
  type: string,
): ParsedSSEEvent | undefined {
  return events.find((e) => e.event === type);
}

describe('POST /api/recipes/extract (E2E)', () => {
  const prisma = getPrisma();

  afterEach(async () => {
    vi.clearAllMocks();
    // Clean test DB state between tests
    await prisma.instructionStep.deleteMany();
    await prisma.ingredient.deleteMany();
    await prisma.recipe.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('happy path: curated recipe', () => {
    it('responds with Content-Type: text/event-stream', async () => {
      mockRunExtractionWorkflow.mockResolvedValue(
        supervisorResult(makeCuratedRecipe()),
      );

      const response = await POST(
        makeRequest({ url: 'https://example.com/recipe' }),
      );

      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    });

    it('emits progress events followed by a final result event', async () => {
      mockRunExtractionWorkflow.mockResolvedValue(
        supervisorResult(makeCuratedRecipe()),
      );

      const response = await POST(
        makeRequest({ url: 'https://example.com/recipe' }),
      );
      // Consuming the full stream also ensures the async IIFE (pipeline) has finished
      const events = await consumeSSEStream(response.body!);

      const types = events.map((e) => e.event);
      expect(types).toContain('progress');
      expect(types.at(-1)).toBe('result');
    });

    it('persists the recipe to the database before emitting result', async () => {
      const curated = makeCuratedRecipe();
      mockRunExtractionWorkflow.mockResolvedValue(supervisorResult(curated));

      const response = await POST(
        makeRequest({ url: 'https://example.com/recipe' }),
      );
      await consumeSSEStream(response.body!);

      const [saved] = await prisma.recipe.findMany({
        include: { ingredients: true, instructionSteps: true },
      });
      expect(saved.title).toBe(curated.title);
      expect(saved.ingredients).toHaveLength(curated.ingredients.length);
      expect(saved.instructionSteps).toHaveLength(
        curated.instructionSteps.length,
      );
    });

    it('includes the persisted recipe (with db-generated id) in the result event', async () => {
      mockRunExtractionWorkflow.mockResolvedValue(
        supervisorResult(makeCuratedRecipe()),
      );

      const response = await POST(
        makeRequest({ url: 'https://example.com/recipe' }),
      );
      const events = await consumeSSEStream(response.body!);

      const resultEvent = getEvent(events, 'result')!;
      const data = resultEvent.data as { recipe: { id: string } };
      expect(data.recipe.id).toBeDefined();
      expect(typeof data.recipe.id).toBe('string');
    });

    it('includes ingredients and instructionSteps in the result event recipe', async () => {
      const curated = makeCuratedRecipe();
      mockRunExtractionWorkflow.mockResolvedValue(supervisorResult(curated));

      const response = await POST(
        makeRequest({ url: 'https://example.com/recipe' }),
      );
      const events = await consumeSSEStream(response.body!);

      const resultEvent = getEvent(events, 'result')!;
      const data = resultEvent.data as {
        recipe: { ingredients: unknown[]; instructionSteps: unknown[] };
      };
      expect(data.recipe.ingredients).toHaveLength(curated.ingredients.length);
      expect(data.recipe.instructionSteps).toHaveLength(
        curated.instructionSteps.length,
      );
    });
  });

  describe('happy path: uncurated (raw extraction)', () => {
    it('still persists and emits result when supervisor returns ExtractedRecipe', async () => {
      const extracted = makeExtractedRecipe();
      mockRunExtractionWorkflow.mockResolvedValue(supervisorResult(extracted));

      const response = await POST(
        makeRequest({ url: 'https://example.com/recipe' }),
      );
      const events = await consumeSSEStream(response.body!);

      const resultEvent = getEvent(events, 'result');
      expect(resultEvent).toBeDefined();
      const data = resultEvent!.data as { recipe: { title: string } };
      expect(data.recipe.title).toBe(extracted.title);
    });
  });

  describe('input validation', () => {
    it('emits INVALID_INPUT error and no result for a missing url field', async () => {
      const response = await POST(makeRequest({}));
      const events = await consumeSSEStream(response.body!);

      expect(events).toHaveLength(1);
      expect(events[0].event).toBe('error');
      expect((events[0].data as { code: string }).code).toBe('INVALID_INPUT');
    });

    it('emits INVALID_INPUT error for a non-URL string', async () => {
      const response = await POST(makeRequest({ url: 'not-a-valid-url' }));
      const events = await consumeSSEStream(response.body!);

      const errorEvent = events[0];
      expect(errorEvent.event).toBe('error');
      expect((errorEvent.data as { code: string }).code).toBe('INVALID_INPUT');
    });

    it('does not persist anything on validation failure', async () => {
      await POST(makeRequest({ url: 'bad' }));

      const count = await prisma.recipe.count();
      expect(count).toBe(0);
    });
  });

  describe('pipeline errors', () => {
    it('emits PARSING_FAILED when supervisor throws LLMParsingError', async () => {
      mockRunExtractionWorkflow.mockRejectedValue(
        new LLMParsingError('Bad JSON from LLM'),
      );

      const response = await POST(
        makeRequest({ url: 'https://example.com/recipe' }),
      );
      const events = await consumeSSEStream(response.body!);

      const errorEvent = getEvent(events, 'error')!;
      expect((errorEvent.data as { code: string }).code).toBe('PARSING_FAILED');
    });

    it('emits RATE_LIMITED when supervisor throws LLMRateLimitError', async () => {
      mockRunExtractionWorkflow.mockRejectedValue(
        new LLMRateLimitError('429 Too Many Requests'),
      );

      const response = await POST(
        makeRequest({ url: 'https://example.com/recipe' }),
      );
      const events = await consumeSSEStream(response.body!);

      const errorEvent = getEvent(events, 'error')!;
      expect((errorEvent.data as { code: string }).code).toBe('RATE_LIMITED');
    });

    it('emits SERVICE_UNAVAILABLE when supervisor throws CircuitBreakerOpenError', async () => {
      mockRunExtractionWorkflow.mockRejectedValue(
        new CircuitBreakerOpenError('Circuit is open'),
      );

      const response = await POST(
        makeRequest({ url: 'https://example.com/recipe' }),
      );
      const events = await consumeSSEStream(response.body!);

      const errorEvent = getEvent(events, 'error')!;
      expect((errorEvent.data as { code: string }).code).toBe(
        'SERVICE_UNAVAILABLE',
      );
    });

    it('emits INTERNAL_ERROR for unexpected non-MAS errors', async () => {
      mockRunExtractionWorkflow.mockRejectedValue(
        new Error('Something totally unexpected'),
      );

      const response = await POST(
        makeRequest({ url: 'https://example.com/recipe' }),
      );
      const events = await consumeSSEStream(response.body!);

      const errorEvent = getEvent(events, 'error')!;
      expect((errorEvent.data as { code: string }).code).toBe('INTERNAL_ERROR');
    });

    it('does not persist anything on pipeline failure', async () => {
      mockRunExtractionWorkflow.mockRejectedValue(
        new LLMParsingError('Failed'),
      );

      const response = await POST(
        makeRequest({ url: 'https://example.com/recipe' }),
      );
      await consumeSSEStream(response.body!);

      const count = await prisma.recipe.count();
      expect(count).toBe(0);
    });
  });

  describe('image upload', () => {
    it('emits uploading_image progress stage and stores imageUrl when image is found', async () => {
      const curated = makeCuratedRecipe();
      const sourceImageUrl = 'https://example.com/photo.jpg';
      const publicUrl = 'https://abc.supabase.co/storage/v1/object/public/recipe-images/recipes/test-id.jpg';
      mockRunExtractionWorkflow.mockResolvedValue(
        supervisorResult(curated, sourceImageUrl),
      );
      mockUploadImageFromUrl.mockResolvedValue(publicUrl);

      const response = await POST(
        makeRequest({ url: 'https://example.com/recipe' }),
      );
      const events = await consumeSSEStream(response.body!);

      const stages = events
        .filter((e) => e.event === 'progress')
        .map((e) => (e.data as { stage: string }).stage);
      expect(stages).toContain('uploading_image');

      const resultEvent = getEvent(events, 'result')!;
      const data = resultEvent.data as { recipe: { imageUrl: string } };
      expect(data.recipe.imageUrl).toBe(publicUrl);
    });

    it('persists imageUrl to the database when upload succeeds', async () => {
      const curated = makeCuratedRecipe();
      const publicUrl = 'https://abc.supabase.co/storage/v1/object/public/recipe-images/recipes/test-id.jpg';
      mockRunExtractionWorkflow.mockResolvedValue(
        supervisorResult(curated, 'https://example.com/photo.jpg'),
      );
      mockUploadImageFromUrl.mockResolvedValue(publicUrl);

      const response = await POST(
        makeRequest({ url: 'https://example.com/recipe' }),
      );
      await consumeSSEStream(response.body!);

      const [saved] = await prisma.recipe.findMany();
      expect(saved.imageUrl).toBe(publicUrl);
    });

    it('skips uploading_image stage and leaves imageUrl null when supervisor returns no imageUrl', async () => {
      mockRunExtractionWorkflow.mockResolvedValue(
        supervisorResult(makeCuratedRecipe(), null),
      );

      const response = await POST(
        makeRequest({ url: 'https://example.com/recipe' }),
      );
      const events = await consumeSSEStream(response.body!);

      const stages = events
        .filter((e) => e.event === 'progress')
        .map((e) => (e.data as { stage: string }).stage);
      expect(stages).not.toContain('uploading_image');
      expect(mockUploadImageFromUrl).not.toHaveBeenCalled();
    });

    it('still emits result and saves recipe when uploadImageFromUrl returns null (upload failed)', async () => {
      const curated = makeCuratedRecipe();
      mockRunExtractionWorkflow.mockResolvedValue(
        supervisorResult(curated, 'https://example.com/photo.jpg'),
      );
      mockUploadImageFromUrl.mockResolvedValue(null);

      const response = await POST(
        makeRequest({ url: 'https://example.com/recipe' }),
      );
      const events = await consumeSSEStream(response.body!);

      const resultEvent = getEvent(events, 'result');
      expect(resultEvent).toBeDefined();

      const [saved] = await prisma.recipe.findMany();
      expect(saved.title).toBe(curated.title);
      expect(saved.imageUrl).toBeNull();
    });
  });
});
