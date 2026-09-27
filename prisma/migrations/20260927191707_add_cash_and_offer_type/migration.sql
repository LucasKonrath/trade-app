-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('TRADE_ONLY', 'CASH_ONLY', 'TRADE_OR_CASH');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "offerType" "OfferType" NOT NULL DEFAULT 'TRADE_ONLY',
ADD COLUMN     "priceCents" INTEGER;

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "cashCents" INTEGER;
