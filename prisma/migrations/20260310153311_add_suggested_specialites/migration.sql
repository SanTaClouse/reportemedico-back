-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "suggestedSpecialties" TEXT[] DEFAULT ARRAY[]::TEXT[];
