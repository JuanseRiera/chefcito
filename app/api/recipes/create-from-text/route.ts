import { NextResponse } from 'next/server';
import { RecipeCreationSupervisor } from '@/lib/mas/RecipeCreationSupervisor';
import { createFromTextRequestSchema } from '@/lib/mas/types/recipeCreation';
import { Logger } from '@/lib/infra/Logger';
import {
  MASError,
  LLMParsingError,
  LLMRateLimitError,
  CircuitBreakerOpenError,
} from '@/lib/mas/types/exceptions';

const logger = Logger.getInstance();

export async function POST(request: Request) {
  const correlationId = logger.generateCorrelationId();
  logger.setCorrelationId(correlationId);

  logger.log({
    timestamp: '',
    level: 'info',
    message: '[api.recipes.create-from-text] Received request',
    correlationId,
  });

  // 1. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const validation = createFromTextRequestSchema.safeParse(body);
  if (!validation.success) {
    const message = validation.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(', ');
    logger.log({
      timestamp: '',
      level: 'warn',
      message: `[api.recipes.create-from-text] Invalid request: ${message}`,
      correlationId,
    });
    return NextResponse.json({ error: `Invalid input: ${message}` }, { status: 400 });
  }

  const { message, sessionId, appLanguage } = validation.data;

  // 2. Run supervisor
  try {
    const supervisor = new RecipeCreationSupervisor();
    const result = await supervisor.processTurn(message, sessionId, appLanguage);

    logger.log({
      timestamp: '',
      level: 'info',
      message: `[api.recipes.create-from-text] Turn completed: ${result.status}`,
      correlationId,
      data: { status: result.status, recipeId: result.recipeId },
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const { status, message: errMsg } = mapError(error);
    logger.log({
      timestamp: '',
      level: 'error',
      message: `[api.recipes.create-from-text] Error: ${errMsg}`,
      correlationId,
      data: { error },
    });
    return NextResponse.json({ error: errMsg }, { status });
  }
}

function mapError(error: unknown): { status: number; message: string } {
  if (error instanceof LLMParsingError) {
    return { status: 422, message: 'Could not process your recipe. Please try rephrasing it.' };
  }
  if (error instanceof LLMRateLimitError) {
    return { status: 429, message: 'The AI is currently under heavy load. Please try again in a moment.' };
  }
  if (error instanceof CircuitBreakerOpenError) {
    return { status: 503, message: 'The recipe creation service is temporarily unavailable.' };
  }
  if (error instanceof MASError) {
    return { status: 500, message: 'An internal error occurred. Please try again.' };
  }
  logger.log({
    timestamp: '',
    level: 'error',
    message: '[api.recipes.create-from-text] Unexpected error',
    data: { error },
  });
  return { status: 500, message: 'An unexpected error occurred.' };
}
