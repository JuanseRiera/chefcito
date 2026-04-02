import { Agent } from '../core/Agent';
import type { LLMConnector } from '../core/LLMConnector';
import type { AgentRequest, AgentResponse } from '../types/mas';
import { AgentState } from '../types/mas';
import type { DraftingAgentPayload, DraftingAgentOutput } from '../types/recipeCreation';
import { draftingAgentOutputSchema } from '../types/recipeCreation';
import { generateRecipeDraftingPrompt } from '../prompts/recipeDrafting';
import { Logger } from '@/lib/infra/Logger';
import { LLMParsingError } from '../types/exceptions';

export class RecipeDraftingAgent extends Agent {
  constructor(llmConnector: LLMConnector) {
    super('RecipeDraftingAgent', llmConnector);
  }

  protected async executeTask(request: AgentRequest): Promise<AgentResponse> {
    const logger = Logger.getInstance();
    const correlationId = logger.getCorrelationId();

    const payload = request.payload.data as DraftingAgentPayload;

    const prompt = generateRecipeDraftingPrompt(
      payload.message,
      payload.currentDraft,
      payload.previousQuestions,
      payload.conversationHistory,
      payload.iterationCount,
      payload.appLanguage,
      payload.sourceLanguage,
    );

    const llmOutput = await this.llmConnector.getCompletion(
      prompt,
      { temperature: 0.2 },
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
        `RecipeDraftingAgent: failed to parse LLM output as JSON: ${error instanceof Error ? error.message : String(error)}`,
        error,
      );
    }

    const result = draftingAgentOutputSchema.safeParse(parsed);
    if (!result.success) {
      throw new LLMParsingError(
        `RecipeDraftingAgent: LLM output failed schema validation: ${result.error.message}`,
        result.error,
      );
    }

    const output: DraftingAgentOutput = result.data;

    logger.log({
      timestamp: '',
      level: 'info',
      message: `[Agent: ${this.name}] Drafting decision: ${output.action} — confidence: ${output.confidence}`,
      agentName: this.name,
      correlationId,
      data: {
        action: output.action,
        missingFields: output.missingFields,
        safetyFlags: output.safetyFlags,
        confidence: output.confidence,
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
