import type { Recipe } from '@/prisma/generated/client';
import type { Agent } from './Agent';

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
}
