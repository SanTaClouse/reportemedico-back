-- =============================================================================
-- BÚSQUEDA FULL-TEXT — Setup completo
-- Ejecutar UNA SOLA VEZ después de `prisma migrate deploy`:
--
--   npx prisma db execute --file=./prisma/search-setup.sql --schema=./prisma/schema.prisma
--
-- Es idempotente: se puede volver a correr sin errores.
-- =============================================================================

-- 1. Columna persistente (evita recalcular tsvector en cada query)
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Índice GIN sobre la columna persistente
CREATE INDEX IF NOT EXISTS idx_articles_search_vector
ON "Article" USING GIN(search_vector);

-- 3. Función del trigger
CREATE OR REPLACE FUNCTION update_article_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('spanish', COALESCE(NEW.title,   '')), 'A') ||
    setweight(to_tsvector('spanish', COALESCE(NEW.excerpt, '')), 'B') ||
    setweight(to_tsvector('spanish', COALESCE(NEW.content, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger: se dispara antes de INSERT o UPDATE de los campos relevantes
DROP TRIGGER IF EXISTS trg_article_search_vector ON "Article";
CREATE TRIGGER trg_article_search_vector
  BEFORE INSERT OR UPDATE OF title, excerpt, content
  ON "Article"
  FOR EACH ROW EXECUTE FUNCTION update_article_search_vector();

-- 5. Poblar filas existentes
UPDATE "Article" SET search_vector =
  setweight(to_tsvector('spanish', COALESCE(title,   '')), 'A') ||
  setweight(to_tsvector('spanish', COALESCE(excerpt, '')), 'B') ||
  setweight(to_tsvector('spanish', COALESCE(content, '')), 'C');
