/*
  Warnings:

  - You are about to drop the column `endDate` on the `Ad` table. All the data in the column will be lost.
  - You are about to drop the column `slotId` on the `Ad` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Ad` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Ad" DROP CONSTRAINT "Ad_slotId_fkey";

-- DropIndex
DROP INDEX "Ad_slotId_isActive_idx";

-- DropIndex
DROP INDEX "Article_search_vector_idx";

-- AlterTable
ALTER TABLE "Ad" DROP COLUMN "endDate",
DROP COLUMN "slotId",
DROP COLUMN "startDate";

-- CreateTable
CREATE TABLE "AdSlotAssignment" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AdSlotAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdSlotAssignment_slotId_order_idx" ON "AdSlotAssignment"("slotId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "AdSlotAssignment_adId_slotId_key" ON "AdSlotAssignment"("adId", "slotId");

-- AddForeignKey
ALTER TABLE "AdSlotAssignment" ADD CONSTRAINT "AdSlotAssignment_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdSlotAssignment" ADD CONSTRAINT "AdSlotAssignment_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "AdSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
