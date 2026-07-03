-- CreateTable
CREATE TABLE "StationEvent" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT,
    "data" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StationEvent_stationId_at_idx" ON "StationEvent"("stationId", "at");

-- AddForeignKey
ALTER TABLE "StationEvent" ADD CONSTRAINT "StationEvent_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
