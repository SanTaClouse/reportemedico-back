-- Índice GIN para búsqueda full-text en español.
-- Ejecutar UNA SOLA VEZ después de `prisma migrate deploy` en producción:
--
--   npx prisma db execute --file=./prisma/indexes.sql --schema=./prisma/schema.prisma
--
-- En desarrollo: también se puede aplicar así, o simplemente omitir
-- (el search funciona sin el índice, solo más lento con muchos artículos).

CREATE INDEX IF NOT EXISTS idx_articles_fulltext
ON "Article"
USING GIN (
  to_tsvector('spanish', title || ' ' || COALESCE(excerpt, '') || ' ' || COALESCE(content, ''))
);
