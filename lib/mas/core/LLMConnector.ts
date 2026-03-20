import { GoogleGenAI } from '@google/genai';

export interface ModelConfig {
  temperature?: number;
  maxOutputTokens?: number;
}

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
  ): Promise<string> {
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
      throw new Error('LLM returned an empty response.');
    }

    return text;
  }
}
