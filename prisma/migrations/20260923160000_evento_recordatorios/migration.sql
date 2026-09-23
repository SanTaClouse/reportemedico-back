-- Recordatorios con el QR: días configurables por evento y registro de los ya
-- enviados a cada inscripto, para no repetir el mismo recordatorio.
ALTER TABLE "Event" ADD COLUMN "reminderDays" INTEGER[] DEFAULT ARRAY[7, 1];
ALTER TABLE "EventRegistration" ADD COLUMN "remindersSent" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
