import { Logger, type CorrelationId } from '@/lib/infra/Logger';

export async function fetchHtml(
  url: string,
  correlationId?: CorrelationId,
): Promise<string> {
  const logger = Logger.getInstance();

  try {
    new URL(url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch HTML from ${url}: ${response.status} ${response.statusText}`,
      );
    }

    return await response.text();
  } catch (error: unknown) {
    logger.log({
      timestamp: '',
      level: 'error',
      message: `Failed to fetch HTML from ${url}: ${error instanceof Error ? error.message : String(error)}`,
      correlationId,
    });
    throw error;
  }
}
