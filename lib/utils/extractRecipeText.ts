import { parse } from 'node-html-parser';
import { Logger, type CorrelationId } from '@/lib/infra/Logger';

export function extractRecipeText(
  html: string,
  correlationId?: CorrelationId,
): string {
  const logger = Logger.getInstance();

  try {
    const document = parse(html);

    const noiseSelectors = [
      'script',
      'style',
      'noscript',
      'iframe',
      'svg',
      'canvas',
      'nav',
      'footer',
      'header',
      'aside',
      'form',
      'button',
      '.ads',
      '.advertisement',
      '#ads',
      '#advertisement',
      '.social-share',
      '.comments',
      '#comments',
    ];

    noiseSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => el.remove());
    });

    const textContent = document.querySelector('body')?.textContent || document.textContent || '';
    const cleanedText = textContent.replace(/\s+/g, ' ').trim();

    return cleanedText;
  } catch (error: unknown) {
    logger.log({
      timestamp: '',
      level: 'error',
      message: `Failed to extract recipe text: ${error instanceof Error ? error.message : String(error)}`,
      correlationId,
    });
    throw error;
  }
}
