import type {
  AgentMessagePayload,
  AgentMessage,
  AgentRequest,
  AgentResponse,
} from '../types/mas';
import { AgentState } from '../types/mas';
import type { LLMConnector } from './LLMConnector';
import { Logger } from '@/lib/infra/Logger';
import type { MASError } from '../types/exceptions';

export abstract class Agent {
  protected _state: AgentState = AgentState.IDLE;

  constructor(
    public readonly name: string,
    protected llmConnector: LLMConnector,
  ) {}

  public get state(): AgentState {
    return this._state;
  }

  public async process(request: AgentRequest): Promise<AgentResponse> {
    const logger = Logger.getInstance();

    const correlationId = request.payload.meta?.correlationId;
    if (correlationId) {
      logger.setCorrelationId(correlationId);
    }

    this._state = AgentState.WORKING;

    logger.log({
      timestamp: '',
      level: 'info',
      message: `[Agent: ${this.name}] Starting task.`,
      agentName: this.name,
      correlationId,
      data: request.payload.data,
    });

    try {
      return await this.executeTask(request);
    } catch (error: unknown) {
      this._state = AgentState.FAILURE;

      logger.log({
        timestamp: '',
        level: 'error',
        message: `[Agent: ${this.name}] Task failed. Error: ${error instanceof Error ? error.message : error}`,
        agentName: this.name,
        correlationId,
        code: (error as MASError)?.code,
        data: (error as MASError)?.originalError,
      });

      throw error;
    }
  }

  protected abstract executeTask(
    request: AgentRequest,
  ): Promise<AgentResponse>;

  protected async sendMessage<T>(
    to: string,
    payload: AgentMessagePayload<T>,
  ): Promise<void> {
    const logger = Logger.getInstance();
    const correlationId = logger.getCorrelationId();

    const message: AgentMessage<T> = {
      id: crypto.randomUUID(),
      from: this.name,
      to: to,
      payload: {
        ...payload,
        meta: {
          ...payload.meta,
          correlationId,
        },
      },
      state: this._state,
      timestamp: new Date(),
    };

    logger.log({
      timestamp: '',
      level: 'info',
      message: `[Agent: ${this.name}] Sending message to ${to}.`,
      agentName: this.name,
      correlationId,
      data: message,
    });
  }
}
