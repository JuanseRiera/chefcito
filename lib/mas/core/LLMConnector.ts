import { GoogleGenAI } from '@google/genai';
import { createResiliencePolicy } from '@/lib/infra/resilience';
import { Logger, type CorrelationId } from '@/lib/infra/Logger';
import {
  LLMError,
  LLMConnectionError,
  LLMRateLimitError,
  LLMQuotaExceededError,
  LLMParsingError,
  MASError,
} from '../types/exceptions';

export interface ModelConfig {
  temperature?: number;
  maxOutputTokens?: number;
}

const llmResiliencePolicy = createResiliencePolicy(
  (err) => err instanceof LLMError && err.isTransient,
  (err) => err instanceof MASError,
);

export class LLMConnector {
  private static instance: LLMConnector;
  private genAI: GoogleGenAI;
  private modelName: string;

  private constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Missing GEMINI_API_KEY environment variable. MAS initialization failed.',
      );
    }

    this.genAI = new GoogleGenAI({ apiKey });
    this.modelName = 'gemini-pro';
  }

  public static getInstance(): LLMConnector {
    if (!LLMConnector.instance) {
      LLMConnector.instance = new LLMConnector();
    }
    return LLMConnector.instance;
  }

  public async getCompletion(
    prompt: string,
    modelConfig?: ModelConfig,
    correlationId?: CorrelationId,
  ): Promise<string> {
    const logger = Logger.getInstance();

    const wrappedOperation = async () => {
      try {
        const response = await this.genAI.models.generateContent({
          model: this.modelName,
          contents: prompt,
          config: {
            temperature: modelConfig?.temperature,
            maxOutputTokens: modelConfig?.maxOutputTokens,
          },
        });

        const text = response.text;
        if (!text) {
          throw new LLMParsingError('LLM returned an empty response.');
        }
        return text;
      } catch (error: unknown) {
        if (error instanceof MASError) {
          throw error;
        }
        throw this.mapSDKErrorToException(error);
      }
    };

    try {
      return await llmResiliencePolicy.execute(wrappedOperation);
    } catch (error: unknown) {
      if (error instanceof MASError) {
        logger.log({
          timestamp: '',
          level: 'error',
          message: error.message,
          correlationId,
          code: error.code,
          data: error.originalError,
        });
      } else if (
        error instanceof Error &&
        error.message.includes('circuit is open')
      ) {
        logger.log({
          timestamp: '',
          level: 'error',
          message: `LLM Circuit is OPEN: ${error.message}`,
          correlationId,
          code: 'CIRCUIT_BREAKER_OPEN',
        });
      } else {
        logger.log({
          timestamp: '',
          level: 'error',
          message: `Unexpected terminal error: ${error}`,
          correlationId,
        });
      }
      throw error;
    }
  }

  private mapSDKErrorToException(error: unknown): LLMError {
    if (error instanceof Error) {
      const status = (error as { status?: number }).status;
      const message = error.message;

      if (status === 429) {
        return new LLMRateLimitError(`LLM rate limited: ${message}`, error);
      }
      if (status === 403) {
        return new LLMQuotaExceededError(
          `LLM quota exceeded: ${message}`,
          error,
        );
      }
      if (
        status === 503 ||
        status === 502 ||
        status === 500 ||
        message.includes('ECONNREFUSED') ||
        message.includes('ETIMEDOUT')
      ) {
        return new LLMConnectionError(
          `LLM connection failed: ${message}`,
          error,
        );
      }
    }

    return new LLMError(
      `Unexpected LLM error: ${error instanceof Error ? error.message : String(error)}`,
      'LLM_UNKNOWN_ERROR',
      false,
      error,
    );
  }
}
