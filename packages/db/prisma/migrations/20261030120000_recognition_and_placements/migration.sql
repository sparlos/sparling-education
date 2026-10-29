-- CreateTable
CREATE TABLE "Recognition" (
    "studentId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "trait" TEXT NOT NULL,
    "term" DATE NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL,
    "seenAt" TIMESTAMP(3),

    CONSTRAINT "Recognition_pkey" PRIMARY KEY ("studentId","classId","trait","term")
);

-- CreateTable
CREATE TABLE "StickerPlacement" (
    "studentId" UUID NOT NULL,
    "sticker" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "layer" INTEGER NOT NULL,

    CONSTRAINT "StickerPlacement_pkey" PRIMARY KEY ("studentId","sticker")
);

-- CreateIndex
CREATE INDEX "Recognition_classId_term_idx" ON "Recognition"("classId", "term");

-- AddForeignKey
ALTER TABLE "Recognition" ADD CONSTRAINT "Recognition_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recognition" ADD CONSTRAINT "Recognition_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StickerPlacement" ADD CONSTRAINT "StickerPlacement_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
