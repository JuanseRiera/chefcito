export type CorrelationId = string;

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  correlationId?: CorrelationId;
  agentName?: string;
  code?: string;
  data?: unknown;
}

export class Logger {
  private static instance: Logger;
  private currentCorrelationId?: CorrelationId;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public generateCorrelationId(): CorrelationId {
    return crypto.randomUUID();
  }

  public setCorrelationId(id: CorrelationId): void {
    this.currentCorrelationId = id;
  }

  public getCorrelationId(): CorrelationId | undefined {
    return this.currentCorrelationId;
  }

  public log(entry: LogEntry): void {
    const finalEntry: LogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      correlationId: entry.correlationId ?? this.currentCorrelationId,
    };

    const output = JSON.stringify(finalEntry);
    if (finalEntry.level === 'error') {
      console.error(output);
    } else if (finalEntry.level === 'warn') {
      console.warn(output);
    } else {
      console.info(output);
    }
  }
}
