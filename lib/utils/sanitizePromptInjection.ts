import { Logger, type CorrelationId } from '@/lib/infra/Logger';

/**
 * Patterns that indicate prompt injection attempts in scraped content.
 * Each regex is tested against individual sentences (case-insensitive).
 */
const INJECTION_PATTERNS: RegExp[] = [
  // Direct instruction overrides
  /ignore\s+(all\s+)?(previous|above|prior|earlier)\s+(instructions?|prompts?|rules?|context)/i,
  /disregard\s+(all\s+)?(previous|above|prior|earlier)\s+(instructions?|prompts?|rules?|context)/i,
  /forget\s+(all\s+)?(previous|above|prior|earlier)\s+(instructions?|prompts?|rules?|context)/i,
  /override\s+(all\s+)?(previous|above|prior|earlier)\s+(instructions?|prompts?|rules?|context)/i,

  // Role hijacking
  /you\s+are\s+now\s+(a|an|the)\b/i,
  /act\s+as\s+(a|an|the|if)\b/i,
  /pretend\s+(you\s+are|to\s+be)\b/i,
  /switch\s+(to|into)\s+(a|an)?\s*\w+\s*mode/i,

  // System prompt leaking / boundary crossing
  /system\s*prompt/i,
  /reveal\s+(your|the)\s+(instructions?|prompt|rules?|system)/i,
  /what\s+are\s+your\s+(instructions?|rules?|directives?)/i,

  // Output manipulation
  /output\s+(only|just|exactly)\s*[""'`]/i,
  /respond\s+with\s+(only|just|exactly)\s*[""'`]/i,
  /print\s+(only|just|exactly)\s*[""'`]/i,
  /say\s+(only|just|exactly)\s*[""'`]/i,

  // Delimiter/fence attacks
  /\[\/?(RECIPE_CONTENT_START|RECIPE_CONTENT_END|SYSTEM|INST|INSTRUCTION)\]/i,
  /<\/?(system|instruction|prompt|user|assistant)>/i,

  // Code execution attempts
  /\beval\s*\(/i,
  /\bexec\s*\(/i,
  /\bimport\s*\(/i,
  /require\s*\(\s*['"`]/i,
];

// Sentence boundary: split on period, exclamation, question mark, or newline
const SENTENCE_SPLIT = /(?<=[.!?])\s+|\n+/;

/**
 * Removes sentences from scraped text that match known prompt injection
 * patterns. Operates as a defense-in-depth layer before the text is
 * embedded into the LLM prompt.
 */
export function sanitizePromptInjection(
  text: string,
  correlationId?: CorrelationId,
): string {
  const logger = Logger.getInstance();
  const sentences = text.split(SENTENCE_SPLIT);
  const cleaned: string[] = [];
  const removed: string[] = [];

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    const isInjection = INJECTION_PATTERNS.some((pattern) =>
      pattern.test(trimmed),
    );

    if (isInjection) {
      removed.push(trimmed);
    } else {
      cleaned.push(trimmed);
    }
  }

  if (removed.length > 0) {
    logger.log({
      timestamp: '',
      level: 'warn',
      message: `Sanitized ${removed.length} suspected prompt injection segment(s) from scraped content.`,
      correlationId,
      data: { removedCount: removed.length, samples: removed.slice(0, 3) },
    });
  }

  return cleaned.join(' ');
}
