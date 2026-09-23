-- CreateEnum
CREATE TYPE "EventRegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EventAttendance" AS ENUM ('DAY', 'EVENING', 'BOTH');

-- CreateEnum
CREATE TYPE "EventSector" AS ENUM ('DOCTOR', 'HEALTH_PROFESSIONAL', 'CLINIC_MANAGEMENT', 'PHARMA', 'MEDTECH', 'INSURANCE', 'FINANCE', 'EDUCATION', 'PUBLIC_SECTOR', 'GUILD', 'STUDENT', 'OTHER');

-- CreateEnum
CREATE TYPE "EventPart" AS ENUM ('DAY', 'EVENING');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SCANNER';

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "venueName" TEXT NOT NULL,
    "venueAddress" TEXT,
    "mapsUrl" TEXT,
    "dayTitle" TEXT NOT NULL,
    "dayStartsAt" TIMESTAMP(3) NOT NULL,
    "dayEndsAt" TIMESTAMP(3) NOT NULL,
    "dayCapacity" INTEGER,
    "eveningTitle" TEXT NOT NULL,
    "eveningVenue" TEXT,
    "eveningStartsAt" TIMESTAMP(3) NOT NULL,
    "eveningEndsAt" TIMESTAMP(3) NOT NULL,
    "eveningCapacity" INTEGER,
    "registrationOpen" BOOLEAN NOT NULL DEFAULT true,
    "qrSendAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "sector" "EventSector" NOT NULL,
    "specialtyId" TEXT,
    "institution" TEXT,
    "position" TEXT,
    "attendance" "EventAttendance" NOT NULL,
    "status" "EventRegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "doctorId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvalEmailSentAt" TIMESTAMP(3),
    "accessToken" TEXT,
    "qrEmailSentAt" TIMESTAMP(3),
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventCheckIn" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "part" "EventPart" NOT NULL,
    "method" TEXT NOT NULL,
    "scannedById" TEXT,
    "scannedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_accessToken_key" ON "EventRegistration"("accessToken");

-- CreateIndex
CREATE INDEX "EventRegistration_eventId_status_idx" ON "EventRegistration"("eventId", "status");

-- CreateIndex
CREATE INDEX "EventRegistration_eventId_createdAt_idx" ON "EventRegistration"("eventId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_eventId_email_key" ON "EventRegistration"("eventId", "email");

-- CreateIndex
CREATE INDEX "EventCheckIn_part_createdAt_idx" ON "EventCheckIn"("part", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventCheckIn_registrationId_part_key" ON "EventCheckIn"("registrationId", "part");

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCheckIn" ADD CONSTRAINT "EventCheckIn_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "EventRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Data: Foro de Salud Reporte Médico 5.0 (docs/v2/11). Va en la migración para
-- que producción lo tenga al desplegar sin pasos manuales. Horarios en UTC:
-- República Dominicana es UTC-4 todo el año (sin horario de verano).
--   Jornada:  26 nov 2026 08:00–17:00 (-04) → 12:00Z–21:00Z
--   Gala:     26 nov 2026 19:00–22:00 (-04) → 23:00Z–02:00Z del 27
--   Email QR: 25 nov 2026 09:00 (-04)       → 13:00Z
-- Todo es editable después desde el admin (/admin/eventos).
INSERT INTO "Event" (
    "id", "slug", "name", "venueName", "venueAddress", "mapsUrl",
    "dayTitle", "dayStartsAt", "dayEndsAt", "dayCapacity",
    "eveningTitle", "eveningVenue", "eveningStartsAt", "eveningEndsAt", "eveningCapacity",
    "registrationOpen", "qrSendAt", "updatedAt"
) VALUES (
    'b3f6c1e2-5a0d-4c8e-9f41-2d7a6e0c5f05', 'foro-salud-5', 'Foro de Salud Reporte Médico 5.0',
    'Hotel Renaissance Santo Domingo Jaragua', 'Av. George Washington 367, Santo Domingo',
    'https://www.google.com/maps/search/?api=1&query=Renaissance+Santo+Domingo+Jaragua+Hotel',
    'Jornada Científica', '2026-11-26 12:00:00', '2026-11-26 21:00:00', 300,
    'Gala Aniversaria · 50 Líderes', 'Salón Anacaona', '2026-11-26 23:00:00', '2026-11-27 02:00:00', 500,
    true, '2026-11-25 13:00:00', CURRENT_TIMESTAMP
) ON CONFLICT ("slug") DO NOTHING;
