import type { Recipe } from '@/prisma/generated/client';
import type { Agent } from './Agent';
import { Logger, type CorrelationId } from '@/lib/infra/Logger';
import type { MASError } from '../types/exceptions';

export abstract class Supervisor {
  protected agents: Map<string, Agent> = new Map();

  constructor(public readonly name: string) {}

  public registerAgent(agent: Agent): void {
    if (this.agents.has(agent.name)) {
      throw new Error(
        `Agent with name "${agent.name}" is already registered.`,
      );
    }
    this.agents.set(agent.name, agent);
  }

  public getAgent(name: string): Agent | undefined {
    return this.agents.get(name);
  }

  public abstract runExtractionWorkflow(url: string): Promise<Recipe>;

  protected async orchestrate<TInput, TOutput>(
    workflowName: string,
    input: TInput,
    workflowLogic: (correlationId: CorrelationId) => Promise<TOutput>,
  ): Promise<TOutput> {
    const logger = Logger.getInstance();

    let correlationId = logger.getCorrelationId();
    if (!correlationId) {
      correlationId = logger.generateCorrelationId();
      logger.setCorrelationId(correlationId);
    }

    logger.log({
      timestamp: '',
      level: 'info',
      message: `[Supervisor: ${this.name}] Starting workflow: ${workflowName}.`,
      correlationId,
      data: input,
    });

    try {
      const result = await workflowLogic(correlationId);

      logger.log({
        timestamp: '',
        level: 'info',
        message: `[Supervisor: ${this.name}] Workflow ${workflowName} completed successfully.`,
        correlationId,
      });

      return result;
    } catch (error: unknown) {
      logger.log({
        timestamp: '',
        level: 'error',
        message: `[Supervisor: ${this.name}] Workflow ${workflowName} failed. Error: ${error instanceof Error ? error.message : error}`,
        correlationId,
        code: (error as MASError)?.code,
        data: (error as MASError)?.originalError,
      });

      throw error;
    }
  }
}
