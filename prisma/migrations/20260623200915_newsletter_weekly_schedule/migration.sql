-- AlterTable
ALTER TABLE "NewsletterSend" ADD COLUMN     "articleTitles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "auto" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "NewsletterSchedule" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "dayOfWeek" INTEGER NOT NULL DEFAULT 1,
    "hour" INTEGER NOT NULL DEFAULT 9,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSchedule_pkey" PRIMARY KEY ("id")
);
