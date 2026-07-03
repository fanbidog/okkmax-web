-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "foundedAt" TEXT,
ADD COLUMN     "intro" TEXT,
ADD COLUMN     "models" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "probeAccount" TEXT,
ADD COLUMN     "probePassword" TEXT;
