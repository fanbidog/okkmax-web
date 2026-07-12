-- CreateTable
CREATE TABLE "IqModel" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "display" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "reasoning" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IqModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IqDaily" (
    "id" TEXT NOT NULL,
    "modelId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "score" INTEGER,
    "stab" INTEGER,

    CONSTRAINT "IqDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IqSyncRound" (
    "id" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "tookMs" INTEGER NOT NULL,
    "note" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IqSyncRound_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IqDaily_modelId_date_key" ON "IqDaily"("modelId", "date");

-- CreateIndex
CREATE INDEX "IqSyncRound_ok_createdAt_idx" ON "IqSyncRound"("ok", "createdAt");

-- AddForeignKey
ALTER TABLE "IqDaily" ADD CONSTRAINT "IqDaily_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "IqModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
