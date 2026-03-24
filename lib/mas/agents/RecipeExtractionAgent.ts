import { Agent } from '../core/Agent';
import type { LLMConnector } from '../core/LLMConnector';
import type { AgentRequest, AgentResponse } from '../types/mas';
import { AgentState } from '../types/mas';
import type { RecipeExtractionPayload } from '../types/extraction';
import { extractedRecipeSchema } from '../types/extraction';
import { fetchHtml } from '@/lib/utils/fetchHtml';
import { extractRecipeText } from '@/lib/utils/extractRecipeText';
import { extractRecipeImage } from '@/lib/utils/extractRecipeImage';
import { sanitizePromptInjection } from '@/lib/utils/sanitizePromptInjection';
import { generateRecipeParsingPrompt } from '../prompts/recipeParser';
import { Logger } from '@/lib/infra/Logger';
import { LLMParsingError } from '../types/exceptions';

export class RecipeExtractionAgent extends Agent {
  constructor(llmConnector: LLMConnector) {
    super('RecipeExtractionAgent', llmConnector);
  }

  protected async executeTask(request: AgentRequest): Promise<AgentResponse> {
    const logger = Logger.getInstance();
    const correlationId = logger.getCorrelationId();

    const payload = request.payload.data as RecipeExtractionPayload;
    const url = payload.url;

    // Fetch raw HTML from the recipe URL
    const html = await fetchHtml(url, correlationId);

    // Detect recipe image from the raw HTML (og:image or JSON-LD)
    const imageUrl = extractRecipeImage(html, correlationId);

    // Preprocess HTML into minimized text
    const cleanedText = extractRecipeText(html, correlationId);

    // Strip sentences that match known prompt injection patterns
    const sanitizedText = sanitizePromptInjection(cleanedText, correlationId);

    // Generate the secure prompt with delimiters and optional feedback
    const prompt = generateRecipeParsingPrompt(
      sanitizedText,
      payload.rejectionFeedback,
    );

    // Invoke LLM via the resilient connector
    const llmOutput = await this.llmConnector.getCompletion(
      prompt,
      undefined,
      correlationId,
    );

    // Strip markdown code fences if the LLM wraps its output
    const sanitizedOutput = llmOutput
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();

    // Parse the LLM response as JSON
    let extractedData: unknown;
    try {
      extractedData = JSON.parse(sanitizedOutput);
    } catch (error: unknown) {
      throw new LLMParsingError(
        `Failed to parse LLM output as JSON: ${error instanceof Error ? error.message : String(error)}`,
        error,
      );
    }

    // Validate against the Zod schema
    const result = extractedRecipeSchema.safeParse(extractedData);
    if (!result.success) {
      throw new LLMParsingError(
        `LLM output failed schema validation: ${result.error.message}`,
        result.error,
      );
    }

    this._state = AgentState.SUCCESS;
    return {
      id: crypto.randomUUID(),
      from: this.name,
      to: request.from,
      payload: {
        data: result.data,
        meta: { correlationId, imageUrl },
      },
      state: this._state,
      timestamp: new Date(),
    };
  }
}
