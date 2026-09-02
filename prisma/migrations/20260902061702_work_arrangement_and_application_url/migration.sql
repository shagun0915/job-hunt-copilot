/*
  Warnings:

  - You are about to drop the column `remote` on the `Application` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "WorkArrangement" AS ENUM ('ONSITE', 'REMOTE', 'HYBRID');

-- AlterTable
ALTER TABLE "Application" DROP COLUMN "remote",
ADD COLUMN     "applicationUrl" TEXT,
ADD COLUMN     "workArrangement" "WorkArrangement";
