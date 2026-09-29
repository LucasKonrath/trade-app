-- CreateEnum
CREATE TYPE "LgsRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateTable
CREATE TABLE "Lgs" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lgs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LgsMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lgsId" TEXT NOT NULL,
    "role" "LgsRole" NOT NULL DEFAULT 'MEMBER',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LgsMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lgs_slug_key" ON "Lgs"("slug");

-- CreateIndex
CREATE INDEX "LgsMembership_lgsId_idx" ON "LgsMembership"("lgsId");

-- CreateIndex
CREATE INDEX "LgsMembership_userId_isPrimary_idx" ON "LgsMembership"("userId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "LgsMembership_userId_lgsId_key" ON "LgsMembership"("userId", "lgsId");

-- AddForeignKey
ALTER TABLE "LgsMembership" ADD CONSTRAINT "LgsMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LgsMembership" ADD CONSTRAINT "LgsMembership_lgsId_fkey" FOREIGN KEY ("lgsId") REFERENCES "Lgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
