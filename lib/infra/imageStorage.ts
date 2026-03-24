import { Logger } from '@/lib/infra/Logger';

const CONTENT_TYPE_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

/**
 * Downloads an image from `sourceUrl` and uploads it to Supabase Storage.
 * Returns the public URL on success, or null on any failure.
 * Never throws — all errors are logged as warnings.
 */
export async function uploadImageFromUrl(
  sourceUrl: string,
  recipeId: string,
): Promise<string | null> {
  const logger = Logger.getInstance();

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'recipe-images';

    if (!supabaseUrl || !serviceRoleKey) {
      logger.log({
        timestamp: '',
        level: 'warn',
        message: '[imageStorage] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — skipping image upload',
      });
      return null;
    }

    // 1. Download image with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let imageResponse: Response;
    try {
      imageResponse = await fetch(sourceUrl, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!imageResponse.ok) {
      logger.log({
        timestamp: '',
        level: 'warn',
        message: `[imageStorage] Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`,
        data: { sourceUrl },
      });
      return null;
    }

    // 2. Validate Content-Type
    const contentType = imageResponse.headers.get('content-type') ?? '';
    const baseContentType = contentType.split(';')[0].trim().toLowerCase();
    if (!baseContentType.startsWith('image/')) {
      logger.log({
        timestamp: '',
        level: 'warn',
        message: `[imageStorage] URL did not return an image content-type: ${contentType}`,
        data: { sourceUrl },
      });
      return null;
    }

    // 3. Derive file extension
    const ext = CONTENT_TYPE_TO_EXT[baseContentType] ?? '.jpg';

    // 4. Upload to Supabase Storage
    const arrayBuffer = await imageResponse.arrayBuffer();
    const storagePath = `recipes/${recipeId}${ext}`;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${storagePath}`;

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': baseContentType,
        'x-upsert': 'true',
      },
      body: arrayBuffer,
    });

    if (!uploadResponse.ok) {
      const body = await uploadResponse.text().catch(() => '');
      logger.log({
        timestamp: '',
        level: 'warn',
        message: `[imageStorage] Supabase upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`,
        data: { storagePath, body },
      });
      return null;
    }

    // 5. Return public URL
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${storagePath}`;
    logger.log({
      timestamp: '',
      level: 'info',
      message: '[imageStorage] Image uploaded successfully',
      data: { recipeId, publicUrl },
    });

    return publicUrl;
  } catch (error: unknown) {
    logger.log({
      timestamp: '',
      level: 'warn',
      message: `[imageStorage] Unexpected error during image upload: ${error instanceof Error ? error.message : String(error)}`,
      data: { sourceUrl, recipeId },
    });
    return null;
  }
}
