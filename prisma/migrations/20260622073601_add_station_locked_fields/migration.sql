-- AlterTable
ALTER TABLE "Station" ADD COLUMN     "lockedFields" TEXT[] DEFAULT ARRAY[]::TEXT[];
