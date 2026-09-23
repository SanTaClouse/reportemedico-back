-- Especialidad escrita a mano: el catálogo de la guía tiene 33 y no cubre todas,
-- así que el formulario ofrece "Otra especialidad" con un campo de texto.
ALTER TABLE "EventRegistration" ADD COLUMN "specialtyOther" TEXT;
