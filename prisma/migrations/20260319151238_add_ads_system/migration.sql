-- CreateTable
CREATE TABLE "AdSlot" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AdSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ad" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdSlot_name_key" ON "AdSlot"("name");

-- CreateIndex
CREATE INDEX "Ad_slotId_isActive_idx" ON "Ad"("slotId", "isActive");

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "AdSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
