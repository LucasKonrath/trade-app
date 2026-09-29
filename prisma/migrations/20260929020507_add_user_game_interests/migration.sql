-- CreateTable
CREATE TABLE "UserGameInterest" (
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGameInterest_pkey" PRIMARY KEY ("userId","gameId")
);

-- CreateIndex
CREATE INDEX "UserGameInterest_gameId_idx" ON "UserGameInterest"("gameId");

-- AddForeignKey
ALTER TABLE "UserGameInterest" ADD CONSTRAINT "UserGameInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGameInterest" ADD CONSTRAINT "UserGameInterest_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
