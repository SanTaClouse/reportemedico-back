/*
  Warnings:

  - A unique constraint covering the columns `[publicId]` on the table `Media` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[fileHash]` on the table `Media` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "fileHash" TEXT,
ADD COLUMN     "folder" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Media_publicId_key" ON "Media"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Media_fileHash_key" ON "Media"("fileHash");
