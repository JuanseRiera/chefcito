import { Agent } from '../core/Agent';
import type { LLMConnector } from '../core/LLMConnector';
import type { AgentRequest, AgentResponse } from '../types/mas';
import { AgentState } from '../types/mas';
import type { RecipeCurationPayload } from '../types/extraction';
import { curationResultSchema } from '../types/extraction';
import { generateRecipeCurationPrompt } from '../prompts/recipeCurator';
import { Logger } from '@/lib/infra/Logger';
import { LLMParsingError } from '../types/exceptions';

export class RecipeCuratorAgent extends Agent {
  constructor(llmConnector: LLMConnector) {
    super('RecipeCuratorAgent', llmConnector);
  }

  protected async executeTask(request: AgentRequest): Promise<AgentResponse> {
    const logger = Logger.getInstance();
    const correlationId = logger.getCorrelationId();

    const payload = request.payload.data as RecipeCurationPayload;
    const recipe = payload.recipe;

    // Build the curation prompt with the extracted recipe data
    const prompt = generateRecipeCurationPrompt(recipe);

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

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(sanitizedOutput);
    } catch (error: unknown) {
      throw new LLMParsingError(
        `Failed to parse curation output as JSON: ${error instanceof Error ? error.message : String(error)}`,
        error,
      );
    }

    // Validate against curation schema
    const result = curationResultSchema.safeParse(parsed);
    if (!result.success) {
      throw new LLMParsingError(
        `Curation output failed schema validation: ${result.error.message}`,
        result.error,
      );
    }

    logger.log({
      timestamp: '',
      level: 'info',
      message: `[Agent: ${this.name}] Curation decision: ${result.data.approved ? 'APPROVED' : 'REJECTED'} — ${result.data.reason}`,
      agentName: this.name,
      correlationId,
    });

    this._state = AgentState.SUCCESS;
    return {
      id: crypto.randomUUID(),
      from: this.name,
      to: request.from,
      payload: {
        data: result.data,
        meta: { correlationId },
      },
      state: this._state,
      timestamp: new Date(),
    };
  }
}
