import { PrismaClient } from '@/prisma/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Prevent multiple instances of Prisma Client in development
declare global {
  var prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    throw new Error(
      'Missing DATABASE_URL environment variable. Database initialization failed.',
    );
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

export const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
