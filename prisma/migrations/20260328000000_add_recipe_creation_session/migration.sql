-- CreateTable
CREATE TABLE "RecipeCreationSession" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'collecting',
    "appLanguage" TEXT NOT NULL,
    "sourceLanguage" TEXT,
    "iterationCount" INTEGER NOT NULL DEFAULT 0,
    "workingDraft" JSONB NOT NULL DEFAULT '{}',
    "missingFields" JSONB NOT NULL DEFAULT '[]',
    "lastQuestions" JSONB NOT NULL DEFAULT '[]',
    "lastUserMessage" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecipeCreationSession_pkey" PRIMARY KEY ("id")
);
