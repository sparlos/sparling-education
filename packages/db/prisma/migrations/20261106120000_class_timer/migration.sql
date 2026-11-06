-- AlterEnum
ALTER TYPE "PlayEnding" ADD VALUE 'timeUp';

-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "timerEndsAt" TIMESTAMP(3);
