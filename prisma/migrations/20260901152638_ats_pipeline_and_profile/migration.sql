/*
  Warnings:

  - You are about to drop the column `gaps` on the `MatchScore` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `MatchScore` table. All the data in the column will be lost.
  - You are about to drop the column `suggestions` on the `MatchScore` table. All the data in the column will be lost.
  - Added the required column `scoreAfter` to the `MatchScore` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scoreBefore` to the `MatchScore` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ResumeKind" AS ENUM ('SPECIALIZED', 'GENERIC', 'OTHER');

-- AlterTable
ALTER TABLE "MatchScore" DROP COLUMN "gaps",
DROP COLUMN "score",
DROP COLUMN "suggestions",
ADD COLUMN     "autoPicked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "formattingFlags" TEXT[],
ADD COLUMN     "hardRequirementsGaps" TEXT[],
ADD COLUMN     "niceToHaveGaps" TEXT[],
ADD COLUMN     "pickReason" TEXT,
ADD COLUMN     "rewrites" JSONB,
ADD COLUMN     "scoreAfter" INTEGER NOT NULL,
ADD COLUMN     "scoreBefore" INTEGER NOT NULL,
ADD COLUMN     "scoreRationale" TEXT,
ADD COLUMN     "titleAlignment" TEXT,
ADD COLUMN     "uncloseableGaps" TEXT[];

-- AlterTable
ALTER TABLE "ResumeVersion" ADD COLUMN     "kind" "ResumeKind" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "specialtyNote" TEXT;

-- CreateTable
CREATE TABLE "CandidateProfile" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "fullName" TEXT,
    "headline" TEXT,
    "location" TEXT,
    "availability" TEXT,
    "statusNote" TEXT,
    "doNotClaim" TEXT[],
    "linksJson" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id")
);
