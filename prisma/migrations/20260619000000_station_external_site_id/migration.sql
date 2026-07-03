ALTER TABLE "Station" ADD COLUMN "externalSiteId" INTEGER;
CREATE UNIQUE INDEX "Station_externalSiteId_key" ON "Station"("externalSiteId");
