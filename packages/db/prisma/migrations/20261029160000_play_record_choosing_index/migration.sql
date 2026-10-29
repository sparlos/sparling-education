-- CreateIndex
CREATE INDEX "PlayRecord_choosing_idx" ON "PlayRecord"("classId", "studentId", "play", "game", "gameVersion", "tier", "kind", "expectation", "exploring", "ending", "at", "sequence");
