-- El campo se eliminó: no teníamos el dato de años de experiencia.
-- Columna nullable sin datos reales en producción → DROP seguro.
ALTER TABLE "Doctor" DROP COLUMN "yearsExperience";
