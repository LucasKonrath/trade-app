-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('OPEN', 'REQUESTED', 'ACCEPTED', 'FINISHED');

-- CreateEnum
CREATE TYPE "TradeDirection" AS ENUM ('FROM_REQUESTER', 'FROM_RESPONDER');

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "responderId" TEXT NOT NULL,
    "status" "TradeStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeItem" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "direction" "TradeDirection" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "TradeItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trade_requesterId_status_idx" ON "Trade"("requesterId", "status");

-- CreateIndex
CREATE INDEX "Trade_responderId_status_idx" ON "Trade"("responderId", "status");

-- CreateIndex
CREATE INDEX "TradeItem_tradeId_idx" ON "TradeItem"("tradeId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeItem_tradeId_cardId_direction_key" ON "TradeItem"("tradeId", "cardId", "direction");

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeItem" ADD CONSTRAINT "TradeItem_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeItem" ADD CONSTRAINT "TradeItem_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
