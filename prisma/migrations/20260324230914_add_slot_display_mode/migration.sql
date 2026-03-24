-- CreateEnum
CREATE TYPE "AdSlotDisplayMode" AS ENUM ('SINGLE', 'STRIP');

-- AlterTable
ALTER TABLE "AdSlot" ADD COLUMN     "displayMode" "AdSlotDisplayMode" NOT NULL DEFAULT 'SINGLE';
