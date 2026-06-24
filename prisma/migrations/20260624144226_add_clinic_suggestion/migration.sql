-- CreateTable
CREATE TABLE "ClinicSuggestion" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "rawName" TEXT NOT NULL,
    "schedule" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolvedClinicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ClinicSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClinicSuggestion_doctorId_idx" ON "ClinicSuggestion"("doctorId");

-- CreateIndex
CREATE INDEX "ClinicSuggestion_status_idx" ON "ClinicSuggestion"("status");

-- AddForeignKey
ALTER TABLE "ClinicSuggestion" ADD CONSTRAINT "ClinicSuggestion_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicSuggestion" ADD CONSTRAINT "ClinicSuggestion_resolvedClinicId_fkey" FOREIGN KEY ("resolvedClinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
