-- CreateTable
CREATE TABLE "TradeReadState" (
    "userId" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeReadState_pkey" PRIMARY KEY ("userId","tradeId")
);

-- CreateIndex
CREATE INDEX "TradeReadState_tradeId_idx" ON "TradeReadState"("tradeId");

-- AddForeignKey
ALTER TABLE "TradeReadState" ADD CONSTRAINT "TradeReadState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeReadState" ADD CONSTRAINT "TradeReadState_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
