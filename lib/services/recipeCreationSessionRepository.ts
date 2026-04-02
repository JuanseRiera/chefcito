import { z } from 'zod';
import type { PrismaClient } from '@/prisma/generated/client';
import {
  workingDraftSchema,
  conversationTurnSchema,
} from '@/lib/mas/types/recipeCreation';
import type { RecipeCreationSession, WorkingDraft, ConversationTurn } from '@/lib/mas/types/recipeCreation';
import { Logger } from '@/lib/infra/Logger';

const SESSION_TTL_HOURS = 24;

const logger = Logger.getInstance();

export class RecipeCreationSessionRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    appLanguage: string;
    lastUserMessage: string;
  }): Promise<RecipeCreationSession> {
    const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

    const row = await this.prisma.recipeCreationSession.create({
      data: {
        appLanguage: data.appLanguage,
        lastUserMessage: data.lastUserMessage,
        expiresAt,
        workingDraft: {},
        missingFields: [],
        lastQuestions: [],
        conversationHistory: [],
      },
    });

    return mapRow(row);
  }

  async findById(id: string): Promise<RecipeCreationSession | null> {
    const row = await this.prisma.recipeCreationSession.findUnique({
      where: { id },
    });
    if (!row) return null;
    return mapRow(row);
  }

  async update(
    id: string,
    data: Partial<{
      status: RecipeCreationSession['status'];
      sourceLanguage: string | null;
      iterationCount: number;
      workingDraft: WorkingDraft;
      missingFields: string[];
      lastQuestions: string[];
      lastUserMessage: string;
      conversationHistory: ConversationTurn[];
      confidence: number;
    }>,
  ): Promise<void> {
    await this.prisma.recipeCreationSession.update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.sourceLanguage !== undefined && { sourceLanguage: data.sourceLanguage }),
        ...(data.iterationCount !== undefined && { iterationCount: data.iterationCount }),
        ...(data.workingDraft !== undefined && { workingDraft: data.workingDraft }),
        ...(data.missingFields !== undefined && { missingFields: data.missingFields }),
        ...(data.lastQuestions !== undefined && { lastQuestions: data.lastQuestions }),
        ...(data.lastUserMessage !== undefined && { lastUserMessage: data.lastUserMessage }),
        ...(data.conversationHistory !== undefined && { conversationHistory: data.conversationHistory }),
        ...(data.confidence !== undefined && { confidence: data.confidence }),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.recipeCreationSession.delete({ where: { id } });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.recipeCreationSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    logger.log({
      timestamp: '',
      level: 'info',
      message: `[RecipeCreationSessionRepository] Deleted ${result.count} expired sessions`,
    });
    return result.count;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type PrismaSessionRow = Awaited<
  ReturnType<PrismaClient['recipeCreationSession']['findUniqueOrThrow']>
>;

const sessionStatusSchema = z.enum(['collecting', 'ready_to_save', 'completed', 'abandoned']);
const stringArraySchema = z.array(z.string());
const conversationHistorySchema = z.array(conversationTurnSchema);

function mapRow(row: PrismaSessionRow): RecipeCreationSession {
  return {
    id: row.id,
    status: sessionStatusSchema.parse(row.status),
    appLanguage: row.appLanguage,
    sourceLanguage: row.sourceLanguage,
    iterationCount: row.iterationCount,
    workingDraft: workingDraftSchema.parse(row.workingDraft ?? {}),
    missingFields: stringArraySchema.parse(row.missingFields ?? []),
    lastQuestions: stringArraySchema.parse(row.lastQuestions ?? []),
    lastUserMessage: row.lastUserMessage,
    conversationHistory: conversationHistorySchema.parse(row.conversationHistory ?? []),
    confidence: row.confidence,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    expiresAt: row.expiresAt,
  };
}
