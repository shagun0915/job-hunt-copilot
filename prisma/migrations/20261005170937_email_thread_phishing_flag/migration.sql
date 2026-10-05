-- AlterTable
ALTER TABLE "EmailThread" ADD COLUMN     "possiblePhishing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phishingReason" TEXT;
