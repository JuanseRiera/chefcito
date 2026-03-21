import type { CorrelationId } from '@/lib/infra/Logger';

export enum AgentState {
  IDLE = 'IDLE',
  WORKING = 'WORKING',
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

export interface AgentMessageMeta extends Record<string, unknown> {
  correlationId?: CorrelationId;
}

export interface AgentMessagePayload<T = unknown> {
  data: T;
  meta?: AgentMessageMeta;
}

export interface AgentMessage<T = unknown> {
  id: string;
  from: string;
  to: string;
  payload: AgentMessagePayload<T>;
  state: AgentState;
  timestamp: Date;
}

export type AgentRequest<T = unknown> = AgentMessage<T>;
export type AgentResponse<T = unknown> = AgentMessage<T>;
