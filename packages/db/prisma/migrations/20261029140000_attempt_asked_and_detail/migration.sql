-- AlterTable
ALTER TABLE "PlayRecord" ADD COLUMN     "asked" TEXT,
ADD COLUMN     "detail" TEXT,
ADD COLUMN     "exploring" BOOLEAN NOT NULL DEFAULT false;
