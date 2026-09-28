-- CreateTable
CREATE TABLE "TradeComment" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TradeComment_tradeId_createdAt_idx" ON "TradeComment"("tradeId", "createdAt");

-- AddForeignKey
ALTER TABLE "TradeComment" ADD CONSTRAINT "TradeComment_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeComment" ADD CONSTRAINT "TradeComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
