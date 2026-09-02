-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "submittedResumeVersionId" TEXT;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_submittedResumeVersionId_fkey" FOREIGN KEY ("submittedResumeVersionId") REFERENCES "ResumeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
