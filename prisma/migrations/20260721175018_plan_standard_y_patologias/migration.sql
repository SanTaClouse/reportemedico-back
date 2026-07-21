-- AlterEnum
ALTER TYPE "DoctorPlan" ADD VALUE 'STANDARD';

-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN     "conditions" TEXT[] DEFAULT ARRAY[]::TEXT[];
