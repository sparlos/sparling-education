-- CreateTable
CREATE TABLE "Reward" (
    "studentId" UUID NOT NULL,
    "item" TEXT NOT NULL,
    "play" TEXT NOT NULL,
    "week" DATE NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seenAt" TIMESTAMP(3),

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("studentId","item")
);

-- CreateIndex
CREATE INDEX "Reward_studentId_week_idx" ON "Reward"("studentId", "week");

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
