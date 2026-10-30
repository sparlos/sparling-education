-- AlterTable
ALTER TABLE "Reward" ADD COLUMN "wardrobeSeenAt" TIMESTAMP(3);

-- Rewards granted before this are old news: only later ones are new in the wardrobe.
UPDATE "Reward" SET "wardrobeSeenAt" = CURRENT_TIMESTAMP;
