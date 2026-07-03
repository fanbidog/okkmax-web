-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "modelPrices" JSONB;

-- AlterTable
ALTER TABLE "Station" ADD COLUMN     "description" TEXT,
ADD COLUMN     "docsUrl" TEXT,
ADD COLUMN     "logoUrl" TEXT;
