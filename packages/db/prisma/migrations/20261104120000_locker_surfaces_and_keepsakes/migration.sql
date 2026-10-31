-- Placements from before the locker had two surfaces are dropped, not
-- migrated (ticket 26, decision 11).
DROP TABLE "StickerPlacement";

-- CreateEnum
CREATE TYPE "LockerSurface" AS ENUM ('front', 'inside');

-- CreateTable
CREATE TABLE "StickerPlacement" (
    "studentId" UUID NOT NULL,
    "sticker" TEXT NOT NULL,
    "surface" "LockerSurface" NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "tilt" DOUBLE PRECISION NOT NULL,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StickerPlacement_pkey" PRIMARY KEY ("studentId","sticker")
);

-- CreateTable
CREATE TABLE "Keepsake" (
    "studentId" UUID NOT NULL,
    "game" TEXT NOT NULL,
    "firstPlayedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seenAt" TIMESTAMP(3),

    CONSTRAINT "Keepsake_pkey" PRIMARY KEY ("studentId","game")
);

-- AddForeignKey
ALTER TABLE "StickerPlacement" ADD CONSTRAINT "StickerPlacement_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Keepsake" ADD CONSTRAINT "Keepsake_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A keepsake for each game already played, new until the locker is opened.
INSERT INTO "Keepsake" ("studentId", "game", "firstPlayedAt")
SELECT "studentId", "game", MIN("receivedAt") FROM "PlayRecord" GROUP BY "studentId", "game";
