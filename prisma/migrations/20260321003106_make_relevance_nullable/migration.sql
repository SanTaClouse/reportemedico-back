-- AlterTable
ALTER TABLE "Article" ALTER COLUMN "relevance" DROP NOT NULL,
ALTER COLUMN "relevance" DROP DEFAULT;
