import { parse } from 'node-html-parser';
import { Logger, type CorrelationId } from '@/lib/infra/Logger';

/**
 * Detects a recipe image URL from raw HTML.
 *
 * Detection strategy (priority order):
 * 1. <meta property="og:image" content="...">
 * 2. <script type="application/ld+json"> with a schema.org Recipe `image` property
 *
 * Never throws — logs warn and returns null on any error.
 */
export function extractRecipeImage(
  html: string,
  correlationId?: CorrelationId,
): string | null {
  const logger = Logger.getInstance();

  try {
    const root = parse(html);

    // 1. og:image meta tag
    const ogImage = root.querySelector('meta[property="og:image"]');
    if (ogImage) {
      const content = ogImage.getAttribute('content');
      if (content && content.startsWith('http')) {
        logger.log({
          timestamp: '',
          level: 'info',
          message: '[extractRecipeImage] Found og:image',
          correlationId,
          data: { imageUrl: content },
        });
        return content;
      }
    }

    // 2. JSON-LD schema.org Recipe image
    const scripts = root.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const json: unknown = JSON.parse(script.text);
        const imageUrl = extractImageFromJsonLd(json);
        if (imageUrl) {
          logger.log({
            timestamp: '',
            level: 'info',
            message: '[extractRecipeImage] Found JSON-LD image',
            correlationId,
            data: { imageUrl },
          });
          return imageUrl;
        }
      } catch {
        // Malformed JSON-LD — skip
      }
    }

    return null;
  } catch (error: unknown) {
    logger.log({
      timestamp: '',
      level: 'warn',
      message: `[extractRecipeImage] Failed to extract image: ${error instanceof Error ? error.message : String(error)}`,
      correlationId,
    });
    return null;
  }
}

function extractImageFromJsonLd(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null;

  const obj = json as Record<string, unknown>;

  // Handle @graph arrays (common in Yoast SEO / WordPress)
  if (Array.isArray(obj['@graph'])) {
    for (const item of obj['@graph'] as unknown[]) {
      const found = extractImageFromJsonLd(item);
      if (found) return found;
    }
  }

  const type = obj['@type'];
  const isRecipe =
    type === 'Recipe' ||
    (Array.isArray(type) && (type as string[]).includes('Recipe'));

  if (!isRecipe) return null;

  const image = obj['image'];
  if (!image) return null;

  if (typeof image === 'string' && image.startsWith('http')) {
    return image;
  }

  if (Array.isArray(image)) {
    const first = image[0];
    if (typeof first === 'string' && first.startsWith('http')) return first;
    if (first && typeof first === 'object') {
      const url = (first as Record<string, unknown>)['url'];
      if (typeof url === 'string' && url.startsWith('http')) return url;
    }
  }

  if (typeof image === 'object') {
    const url = (image as Record<string, unknown>)['url'];
    if (typeof url === 'string' && url.startsWith('http')) return url;
  }

  return null;
}
