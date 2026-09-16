-- CreateTable
CREATE TABLE "WorkoutLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "performedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exerciseName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sets" INTEGER,
    "reps" INTEGER,
    "weightKg" REAL,
    "durationMin" REAL,
    "distanceKm" REAL,
    "calories" REAL,
    "rpe" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CoachMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "WorkoutLog_performedAt_idx" ON "WorkoutLog"("performedAt");

-- CreateIndex
CREATE INDEX "CoachMessage_createdAt_idx" ON "CoachMessage"("createdAt");
