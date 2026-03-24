-- Columna search_vector para full-text search en artículos
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- Índice GIN para búsquedas rápidas
CREATE INDEX IF NOT EXISTS "Article_search_vector_idx" ON "Article" USING GIN ("search_vector");

-- Función que actualiza el vector al insertar/modificar un artículo
CREATE OR REPLACE FUNCTION article_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('spanish', COALESCE(NEW.title,   '')), 'A') ||
    setweight(to_tsvector('spanish', COALESCE(NEW.excerpt, '')), 'B') ||
    setweight(to_tsvector('spanish', COALESCE(
      regexp_replace(COALESCE(NEW.content, ''), '<[^>]*>', ' ', 'g'), ''
    )), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que llama a la función en cada INSERT o UPDATE
DROP TRIGGER IF EXISTS article_search_vector_trigger ON "Article";
CREATE TRIGGER article_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, excerpt, content
  ON "Article"
  FOR EACH ROW EXECUTE FUNCTION article_search_vector_update();

-- Poblar el vector en los artículos ya existentes
UPDATE "Article" SET
  search_vector =
    setweight(to_tsvector('spanish', COALESCE(title,   '')), 'A') ||
    setweight(to_tsvector('spanish', COALESCE(excerpt, '')), 'B') ||
    setweight(to_tsvector('spanish', COALESCE(
      regexp_replace(COALESCE(content, ''), '<[^>]*>', ' ', 'g'), ''
    )), 'C');
