-- CreateEnum
CREATE TYPE "PlayRecordKind" AS ENUM ('attempt', 'end');

-- CreateEnum
CREATE TYPE "Assistance" AS ENUM ('hint', 'demonstration', 'guided');

-- CreateEnum
CREATE TYPE "PlayEnding" AS ENUM ('finished', 'left', 'crashed');

-- CreateTable
CREATE TABLE "PlayRecord" (
    "studentId" UUID NOT NULL,
    "id" TEXT NOT NULL,
    "classId" UUID NOT NULL,
    "play" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "gameVersion" INTEGER NOT NULL,
    "tier" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "kind" "PlayRecordKind" NOT NULL,
    "task" TEXT,
    "expectation" TEXT,
    "succeeded" BOOLEAN,
    "misconception" TEXT,
    "assisted" "Assistance",
    "ending" "PlayEnding",
    "sequence" SERIAL NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayRecord_pkey" PRIMARY KEY ("studentId","id")
);

-- CreateIndex
CREATE INDEX "PlayRecord_classId_idx" ON "PlayRecord"("classId");

-- CreateIndex
CREATE INDEX "PlayRecord_studentId_play_idx" ON "PlayRecord"("studentId", "play");

-- AddForeignKey
ALTER TABLE "PlayRecord" ADD CONSTRAINT "PlayRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayRecord" ADD CONSTRAINT "PlayRecord_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
