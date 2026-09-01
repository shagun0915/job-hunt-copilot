-- CreateEnum
CREATE TYPE "DraftKind" AS ENUM ('COVER_LETTER', 'RECRUITER_REPLY', 'REFERRAL_ASK', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "EmbeddingKind" AS ENUM ('APPLICATION', 'EMAIL_THREAD');

-- CreateTable
CREATE TABLE "Draft" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "kind" "DraftKind" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "instructions" TEXT,
    "resumeVersionId" TEXT,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Embedding" (
    "id" TEXT NOT NULL,
    "kind" "EmbeddingKind" NOT NULL,
    "refId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "vector" DOUBLE PRECISION[],
    "model" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Embedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Draft_applicationId_idx" ON "Draft"("applicationId");

-- CreateIndex
CREATE INDEX "Embedding_kind_idx" ON "Embedding"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "Embedding_kind_refId_key" ON "Embedding"("kind", "refId");

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
