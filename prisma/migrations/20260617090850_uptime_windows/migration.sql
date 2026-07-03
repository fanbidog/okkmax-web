-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "currentLatencyMs" INTEGER,
ADD COLUMN     "currentStatus" INTEGER,
ADD COLUMN     "uptimeSyncedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UptimeWindow" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "points" JSONB NOT NULL,
    "avg" DOUBLE PRECISION NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UptimeWindow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UptimeWindow_channelId_period_key" ON "UptimeWindow"("channelId", "period");

-- AddForeignKey
ALTER TABLE "UptimeWindow" ADD CONSTRAINT "UptimeWindow_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
