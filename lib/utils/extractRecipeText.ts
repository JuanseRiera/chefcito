import { JSDOM } from 'jsdom';
import { Logger, type CorrelationId } from '@/lib/infra/Logger';

export function extractRecipeText(
  html: string,
  correlationId?: CorrelationId,
): string {
  const logger = Logger.getInstance();

  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;

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
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => el.remove());
    });

    const textContent = document.body.textContent || '';
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
