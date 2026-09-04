-- migration اولیه: فعال‌سازی pgvector و ساخت جدول اسناد قانونی
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS legal_documents (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('ecfr','federal_register','courtlistener','eurlex')),
  jurisdiction TEXT NOT NULL CHECK (jurisdiction IN ('US','EU')),
  country TEXT,
  title TEXT,
  section_reference TEXT,
  full_text TEXT NOT NULL,
  embedding VECTOR(1024),
  source_url TEXT,
  last_updated TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS legal_documents_embedding_hnsw_idx
  ON legal_documents USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS legal_documents_source_idx ON legal_documents (source);
CREATE INDEX IF NOT EXISTS legal_documents_jurisdiction_idx ON legal_documents (jurisdiction);
