import type { PrismaClient } from '@/prisma/generated/client';
import { Prisma } from '@/prisma/generated/client';
import type { RecipeCreationSession, WorkingDraft } from '@/lib/mas/types/recipeCreation';
import { Logger } from '@/lib/infra/Logger';

const SESSION_TTL_HOURS = 24;

const logger = Logger.getInstance();

/**
 * Repository for RecipeCreationSession using raw SQL.
 * The Prisma client cannot be regenerated in this environment, so we use
 * $queryRaw / $executeRaw directly with manually-defined TypeScript types.
 */
export class RecipeCreationSessionRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    appLanguage: string;
    lastUserMessage: string;
  }): Promise<RecipeCreationSession> {
    const id = generateCuid();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_HOURS * 60 * 60 * 1000);

    await this.prisma.$executeRaw`
      INSERT INTO "RecipeCreationSession"
        ("id", "status", "appLanguage", "sourceLanguage", "iterationCount",
         "workingDraft", "missingFields", "lastQuestions", "lastUserMessage",
         "confidence", "createdAt", "updatedAt", "expiresAt")
      VALUES
        (${id}, 'collecting', ${data.appLanguage}, NULL, 0,
         ${Prisma.raw("'{}'")}::jsonb, ${Prisma.raw("'[]'")}::jsonb, ${Prisma.raw("'[]'")}::jsonb,
         ${data.lastUserMessage}, 0, ${now}::timestamptz, ${now}::timestamptz, ${expiresAt}::timestamptz)
    `;

    const session = await this.findById(id);
    if (!session) throw new Error('Failed to create session');
    return session;
  }

  async findById(id: string): Promise<RecipeCreationSession | null> {
    const rows = await this.prisma.$queryRaw<RawSessionRow[]>`
      SELECT * FROM "RecipeCreationSession" WHERE "id" = ${id} LIMIT 1
    `;
    if (rows.length === 0) return null;
    return mapRow(rows[0]);
  }

  async update(
    id: string,
    data: Partial<{
      status: RecipeCreationSession['status'];
      sourceLanguage: string;
      iterationCount: number;
      workingDraft: WorkingDraft;
      missingFields: string[];
      lastQuestions: string[];
      lastUserMessage: string;
      confidence: number;
    }>,
  ): Promise<void> {
    const now = new Date();
    const setClauses: string[] = ['"updatedAt" = ' + sqlEscape(now.toISOString())];

    if (data.status !== undefined) {
      setClauses.push('"status" = ' + sqlString(data.status));
    }
    if (data.sourceLanguage !== undefined) {
      setClauses.push('"sourceLanguage" = ' + sqlString(data.sourceLanguage));
    }
    if (data.iterationCount !== undefined) {
      setClauses.push('"iterationCount" = ' + data.iterationCount);
    }
    if (data.workingDraft !== undefined) {
      setClauses.push('"workingDraft" = ' + sqlJsonb(data.workingDraft));
    }
    if (data.missingFields !== undefined) {
      setClauses.push('"missingFields" = ' + sqlJsonb(data.missingFields));
    }
    if (data.lastQuestions !== undefined) {
      setClauses.push('"lastQuestions" = ' + sqlJsonb(data.lastQuestions));
    }
    if (data.lastUserMessage !== undefined) {
      setClauses.push('"lastUserMessage" = ' + sqlString(data.lastUserMessage));
    }
    if (data.confidence !== undefined) {
      setClauses.push('"confidence" = ' + data.confidence);
    }

    const query = `UPDATE "RecipeCreationSession" SET ${setClauses.join(', ')} WHERE "id" = ${sqlString(id)}`;
    await this.prisma.$executeRawUnsafe(query);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.$executeRaw`
      DELETE FROM "RecipeCreationSession" WHERE "id" = ${id}
    `;
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.$executeRaw`
      DELETE FROM "RecipeCreationSession" WHERE "expiresAt" < NOW()
    `;
    logger.log({
      timestamp: '',
      level: 'info',
      message: `[RecipeCreationSessionRepository] Deleted ${result} expired sessions`,
    });
    return result;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface RawSessionRow {
  id: string;
  status: string;
  appLanguage: string;
  sourceLanguage: string | null;
  iterationCount: number;
  workingDraft: unknown;
  missingFields: unknown;
  lastQuestions: unknown;
  lastUserMessage: string | null;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

function mapRow(row: RawSessionRow): RecipeCreationSession {
  return {
    id: row.id,
    status: row.status as RecipeCreationSession['status'],
    appLanguage: row.appLanguage,
    sourceLanguage: row.sourceLanguage,
    iterationCount: Number(row.iterationCount),
    workingDraft: (typeof row.workingDraft === 'string'
      ? JSON.parse(row.workingDraft)
      : row.workingDraft) as WorkingDraft,
    missingFields: (typeof row.missingFields === 'string'
      ? JSON.parse(row.missingFields)
      : row.missingFields) as string[],
    lastQuestions: (typeof row.lastQuestions === 'string'
      ? JSON.parse(row.lastQuestions)
      : row.lastQuestions) as string[],
    lastUserMessage: row.lastUserMessage,
    confidence: Number(row.confidence),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    expiresAt: row.expiresAt,
  };
}

/** Simple CUID-like unique id generator. */
function generateCuid(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 9);
  return `c${timestamp}${random}`;
}

/** Escape a value as a SQL string literal (single-quoted, escaped). */
function sqlString(value: string): string {
  return "'" + value.replace(/'/g, "''") + "'";
}

/** Serialize a value as an escaped SQL JSONB literal. */
function sqlJsonb(value: unknown): string {
  const json = JSON.stringify(value).replace(/'/g, "''");
  return "'" + json + "'::jsonb";
}

/** Wrap a string as a SQL timestamp literal. */
function sqlEscape(value: string): string {
  return "'" + value.replace(/'/g, "''") + "'::timestamptz";
}
