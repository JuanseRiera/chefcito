import { Agent } from '../core/Agent';
import type { LLMConnector } from '../core/LLMConnector';
import type { AgentRequest, AgentResponse } from '../types/mas';
import { AgentState } from '../types/mas';
import type { FinalizerAgentPayload, FinalizerAgentOutput } from '../types/recipeCreation';
import { finalizerAgentOutputSchema } from '../types/recipeCreation';
import { generateRecipeFinalizerPrompt } from '../prompts/recipeFinalizer';
import { Logger } from '@/lib/infra/Logger';
import { LLMParsingError } from '../types/exceptions';

export class RecipeFinalizerAgent extends Agent {
  constructor(llmConnector: LLMConnector) {
    super('RecipeFinalizerAgent', llmConnector);
  }

  protected async executeTask(request: AgentRequest): Promise<AgentResponse> {
    const logger = Logger.getInstance();
    const correlationId = logger.getCorrelationId();

    const payload = request.payload.data as FinalizerAgentPayload;

    const prompt = generateRecipeFinalizerPrompt(payload.draft, payload.sourceLanguage);

    const llmOutput = await this.llmConnector.getCompletion(
      prompt,
      { temperature: 0.1 },
      correlationId,
    );

    const sanitizedOutput = llmOutput
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(sanitizedOutput);
    } catch (error: unknown) {
      throw new LLMParsingError(
        `RecipeFinalizerAgent: failed to parse LLM output as JSON: ${error instanceof Error ? error.message : String(error)}`,
        error,
      );
    }

    const result = finalizerAgentOutputSchema.safeParse(parsed);
    if (!result.success) {
      throw new LLMParsingError(
        `RecipeFinalizerAgent: LLM output failed schema validation: ${result.error.message}`,
        result.error,
      );
    }

    const output: FinalizerAgentOutput = result.data;

    logger.log({
      timestamp: '',
      level: 'info',
      message: `[Agent: ${this.name}] Finalization complete — confidence: ${output.confidence}`,
      agentName: this.name,
      correlationId,
      data: {
        title: output.recipe.title,
        confidence: output.confidence,
        warnings: output.normalizationWarnings,
      },
    });

    this._state = AgentState.SUCCESS;
    return {
      id: crypto.randomUUID(),
      from: this.name,
      to: request.from,
      payload: {
        data: output,
        meta: { correlationId },
      },
      state: this._state,
      timestamp: new Date(),
    };
  }
}
