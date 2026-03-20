import type {
  AgentMessagePayload,
  AgentMessage,
  AgentRequest,
  AgentResponse,
} from '../types/mas';
import { AgentState } from '../types/mas';
import type { LLMConnector } from './LLMConnector';

export abstract class Agent {
  protected _state: AgentState = AgentState.IDLE;

  constructor(
    public readonly name: string,
    protected llmConnector: LLMConnector,
  ) {}

  public get state(): AgentState {
    return this._state;
  }

  public abstract process(request: AgentRequest): Promise<AgentResponse>;

  protected async sendMessage<T>(
    to: string,
    payload: AgentMessagePayload<T>,
  ): Promise<void> {
    const message: AgentMessage<T> = {
      id: crypto.randomUUID(),
      from: this.name,
      to: to,
      payload: payload,
      state: this._state,
      timestamp: new Date(),
    };

    // For Story 1.1, simply log the message
    console.log(
      `[Agent: ${this.name}] Sending message:`,
      JSON.stringify(message, null, 2),
    );
    // Future implementation: this.supervisor.receiveMessage(message);
  }
}
