-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "demoClassId" UUID,
ADD COLUMN     "demoGiven" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "demo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "viewingAsId" UUID;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_demoClassId_fkey" FOREIGN KEY ("demoClassId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_viewingAsId_fkey" FOREIGN KEY ("viewingAsId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
