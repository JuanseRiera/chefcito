import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchHtml } from '@/lib/utils/fetchHtml';

describe('fetchHtml', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns HTML text on a successful 200 response', async () => {
    const mockHtml = '<html><body>Recipe content</body></html>';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockHtml,
    } as Response);

    const result = await fetchHtml('https://example.com/recipe');

    expect(result).toBe(mockHtml);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/recipe',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('throws an Error when the HTTP response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);

    await expect(fetchHtml('https://example.com/missing')).rejects.toThrow(
      '404 Not Found',
    );
  });

  it('throws a TypeError for an invalid URL', async () => {
    await expect(fetchHtml('not-a-valid-url')).rejects.toThrow();
  });

  it('re-throws a network error from fetch', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(fetchHtml('https://example.com/recipe')).rejects.toThrow(
      'ECONNREFUSED',
    );
  });
});
