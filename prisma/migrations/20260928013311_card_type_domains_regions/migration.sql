-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "cardType" TEXT,
ADD COLUMN     "domains" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "regions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "Card_gameId_rarity_idx" ON "Card"("gameId", "rarity");

-- CreateIndex
CREATE INDEX "Card_gameId_cardType_idx" ON "Card"("gameId", "cardType");
