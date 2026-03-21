import { PrismaClient } from '@/prisma/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

let client: PrismaClient | undefined;

export function getTestPrismaClient(): PrismaClient {
  if (!client) {
    const connectionString = process.env['DATABASE_URL'];
    if (!connectionString) {
      throw new Error('DATABASE_URL not set. Make sure .env.test is loaded.');
    }
    client = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
  }
  return client;
}

export async function cleanDatabase(): Promise<void> {
  const prisma = getTestPrismaClient();
  await prisma.instructionStep.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.recipe.deleteMany();
}

export async function disconnectTestDb(): Promise<void> {
  if (client) {
    await client.$disconnect();
    client = undefined;
  }
}
