-- CreateEnum
CREATE TYPE "SubscriberSource" AS ENUM ('ARTICLE_SUBMISSION', 'NEWSLETTER_SIGNUP');

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "authorEmail" TEXT;

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "source" "SubscriberSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriberTag" (
    "subscriberId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "SubscriberTag_pkey" PRIMARY KEY ("subscriberId","tagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_email_key" ON "Subscriber"("email");

-- CreateIndex
CREATE INDEX "Subscriber_source_idx" ON "Subscriber"("source");

-- CreateIndex
CREATE INDEX "Subscriber_createdAt_idx" ON "Subscriber"("createdAt");

-- AddForeignKey
ALTER TABLE "SubscriberTag" ADD CONSTRAINT "SubscriberTag_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriberTag" ADD CONSTRAINT "SubscriberTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
