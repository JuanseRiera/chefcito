import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { uploadImageFromUrl } from '@/lib/infra/imageStorage';

const SUPABASE_URL = 'https://abc.supabase.co';
const SERVICE_KEY = 'test-service-role-key';
const BUCKET = 'recipe-images';
const RECIPE_ID = 'test-recipe-id-123';
const IMAGE_URL = 'https://example.com/photo.jpg';

function mockImageFetch(contentType: string, ok = true) {
  const imageArrayBuffer = new ArrayBuffer(8);
  return vi.fn().mockResolvedValueOnce({
    ok,
    status: ok ? 200 : 403,
    statusText: ok ? 'OK' : 'Forbidden',
    headers: { get: () => contentType },
    arrayBuffer: async () => imageArrayBuffer,
    text: async () => '',
  } as unknown as Response);
}

function mockUploadResponse(ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? 'OK' : 'Internal Server Error',
    text: async () => (ok ? '' : 'upload failed'),
  } as unknown as Response;
}

describe('uploadImageFromUrl', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
    process.env.SUPABASE_STORAGE_BUCKET = BUCKET;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  it('returns the public Supabase URL on success', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'image/jpeg' },
        arrayBuffer: async () => new ArrayBuffer(8),
      } as unknown as Response)
      .mockResolvedValueOnce(mockUploadResponse(true));

    const result = await uploadImageFromUrl(IMAGE_URL, RECIPE_ID);

    expect(result).toBe(
      `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/recipes/${RECIPE_ID}.jpg`,
    );
  });

  it('uses .png extension for image/png content-type', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'image/png' },
        arrayBuffer: async () => new ArrayBuffer(8),
      } as unknown as Response)
      .mockResolvedValueOnce(mockUploadResponse(true));

    const result = await uploadImageFromUrl(IMAGE_URL, RECIPE_ID);

    expect(result).toContain('.png');
  });

  it('uses .webp extension for image/webp content-type', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'image/webp' },
        arrayBuffer: async () => new ArrayBuffer(8),
      } as unknown as Response)
      .mockResolvedValueOnce(mockUploadResponse(true));

    const result = await uploadImageFromUrl(IMAGE_URL, RECIPE_ID);

    expect(result).toContain('.webp');
  });

  it('calls Supabase upload with the correct path and headers', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'image/jpeg' },
        arrayBuffer: async () => new ArrayBuffer(8),
      } as unknown as Response)
      .mockResolvedValueOnce(mockUploadResponse(true));
    global.fetch = fetchMock;

    await uploadImageFromUrl(IMAGE_URL, RECIPE_ID);

    const [uploadUrl, uploadOpts] = fetchMock.mock.calls[1];
    expect(uploadUrl).toBe(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/recipes/${RECIPE_ID}.jpg`,
    );
    expect((uploadOpts as RequestInit).method).toBe('PUT');
    expect(
      ((uploadOpts as RequestInit).headers as Record<string, string>)[
        'Authorization'
      ],
    ).toBe(`Bearer ${SERVICE_KEY}`);
    expect(
      ((uploadOpts as RequestInit).headers as Record<string, string>)[
        'x-upsert'
      ],
    ).toBe('true');
  });

  it('returns null when SUPABASE_URL is not set', async () => {
    delete process.env.SUPABASE_URL;

    const result = await uploadImageFromUrl(IMAGE_URL, RECIPE_ID);

    expect(result).toBeNull();
  });

  it('returns null when SUPABASE_SERVICE_ROLE_KEY is not set', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const result = await uploadImageFromUrl(IMAGE_URL, RECIPE_ID);

    expect(result).toBeNull();
  });

  it('returns null when the image download returns a non-ok status', async () => {
    global.fetch = mockImageFetch('image/jpeg', false);

    const result = await uploadImageFromUrl(IMAGE_URL, RECIPE_ID);

    expect(result).toBeNull();
  });

  it('returns null when the content-type is not an image', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'text/html' },
      arrayBuffer: async () => new ArrayBuffer(8),
    } as unknown as Response);

    const result = await uploadImageFromUrl(IMAGE_URL, RECIPE_ID);

    expect(result).toBeNull();
  });

  it('returns null when content-type header is null', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      headers: { get: () => null },
      arrayBuffer: async () => new ArrayBuffer(8),
    } as unknown as Response);

    const result = await uploadImageFromUrl(IMAGE_URL, RECIPE_ID);

    expect(result).toBeNull();
  });

  it('returns null when Supabase upload responds with a non-ok status', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'image/jpeg' },
        arrayBuffer: async () => new ArrayBuffer(8),
      } as unknown as Response)
      .mockResolvedValueOnce(mockUploadResponse(false));

    const result = await uploadImageFromUrl(IMAGE_URL, RECIPE_ID);

    expect(result).toBeNull();
  });

  it('returns null and does not throw when fetch rejects with a network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      uploadImageFromUrl(IMAGE_URL, RECIPE_ID),
    ).resolves.toBeNull();
  });
});
