import vard from '@andersmyrmel/vard';
import type { Threat } from '@andersmyrmel/vard';
import { Logger, type CorrelationId } from '@/lib/infra/Logger';

/**
 * Removes prompt injection attempts from scraped text using the vard library.
 * Operates as a defense-in-depth layer before text is embedded into the LLM prompt.
 */
export function sanitizePromptInjection(
  text: string,
  correlationId?: CorrelationId,
): string {
  const logger = Logger.getInstance();
  const detectedThreats: Threat[] = [];

  const guard = vard()
    .delimiters([
      'RECIPE_CONTENT_START',
      'RECIPE_CONTENT_END',
      'RECIPE_DATA_START',
      'RECIPE_DATA_END',
    ])
    .sanitize('instructionOverride')
    .sanitize('roleManipulation')
    .sanitize('delimiterInjection')
    .sanitize('systemPromptLeak')
    .sanitize('encoding')
    .onWarn((threat: Threat) => {
      detectedThreats.push(threat);
    });

  const result = guard.safeParse(text);

  if (!result.safe) {
    // safeParse returns unsafe when threats exceed threshold and action is block.
    // Since we configured all actions to sanitize, this branch handles edge cases.
    logger.log({
      timestamp: '',
      level: 'warn',
      message: `Prompt injection detected and blocked: ${result.threats.length} threat(s).`,
      correlationId,
      data: {
        threats: result.threats.map((t) => ({
          type: t.type,
          severity: t.severity,
          match: t.match,
        })),
      },
    });
    // Return empty string as fallback — the extraction will fail on empty content
    return '';
  }

  if (detectedThreats.length > 0) {
    logger.log({
      timestamp: '',
      level: 'warn',
      message: `Sanitized ${detectedThreats.length} prompt injection threat(s) from scraped content.`,
      correlationId,
      data: {
        threats: detectedThreats.map((t) => ({
          type: t.type,
          severity: t.severity,
          match: t.match,
        })),
      },
    });
  }

  return result.data;
}
