-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "requesterFinishedAt" TIMESTAMP(3),
ADD COLUMN     "responderFinishedAt" TIMESTAMP(3);
