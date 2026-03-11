-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "authorPhoto" TEXT;

-- CreateTable
CREATE TABLE "CouncilMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "photo" TEXT,
    "linkedinUrl" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CouncilMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CouncilMember_order_idx" ON "CouncilMember"("order");
