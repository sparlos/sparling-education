-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "walkthroughsSeen" TEXT[] DEFAULT ARRAY[]::TEXT[];
