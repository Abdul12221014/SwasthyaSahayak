-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Health Knowledge Base Documents Table
-- Stores chunked health documents with embeddings for RAG retrieval
CREATE TABLE IF NOT EXISTS public.health_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'hi', 'or', 'as')),
  source TEXT NOT NULL,           -- Canonical URL or document identifier
  category TEXT,                   -- vaccination, fever, malaria, etc.
  content TEXT NOT NULL,           -- Chunk text (400-600 tokens)
  chunk_index INT NOT NULL,        -- Position in original document
  embedding VECTOR(768),           -- 768-dimensional vector matching ML model
  metadata JSONB,                  -- Additional metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, chunk_index)      -- Prevent duplicate chunks
);

-- Full-text search column for hybrid retrieval
ALTER TABLE public.health_documents
  ADD COLUMN IF NOT EXISTS ts tsvector 
  GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED;

-- Indexes for efficient retrieval
CREATE INDEX IF NOT EXISTS idx_health_doc_source 
  ON public.health_documents(source);

CREATE INDEX IF NOT EXISTS idx_health_doc_lang 
  ON public.health_documents(language);

CREATE INDEX IF NOT EXISTS idx_health_doc_category 
  ON public.health_documents(category);

CREATE INDEX IF NOT EXISTS idx_health_doc_ts 
  ON public.health_documents USING GIN (ts);

-- IVFFlat index for vector similarity search
-- Lists = 100 (rule of thumb: sqrt(total_rows), adjust based on data size)
CREATE INDEX IF NOT EXISTS idx_health_doc_embed
  ON public.health_documents 
  USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);

-- Knowledge Base Metadata Table
-- Tracks embedding model versions and KB state
CREATE TABLE IF NOT EXISTS public.kb_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize KB metadata
INSERT INTO public.kb_meta (key, value)
VALUES 
  ('embedding_model_version', 'v1.0.0'),
  ('total_documents', '0'),
  ('last_ingest', 'never')
ON CONFLICT (key) DO NOTHING;

-- Function for vector similarity search
CREATE OR REPLACE FUNCTION match_health_documents(
  query_embedding VECTOR(768),
  match_count INT DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  title TEXT,
  source TEXT,
  category TEXT,
  language TEXT,
  similarity FLOAT
)
LANGUAGE SQL STABLE AS $$
  SELECT 
    id,
    content,
    title,
    source,
    category,
    language,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.health_documents
  WHERE embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) >= similarity_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Function for hybrid search (vector + full-text)
CREATE OR REPLACE FUNCTION hybrid_search_health_documents(
  query_embedding VECTOR(768),
  query_text TEXT,
  match_count INT DEFAULT 5,
  vector_weight FLOAT DEFAULT 0.6,
  text_weight FLOAT DEFAULT 0.4
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  title TEXT,
  source TEXT,
  category TEXT,
  language TEXT,
  vector_similarity FLOAT,
  text_rank FLOAT,
  hybrid_score FLOAT
)
LANGUAGE SQL STABLE AS $$
  WITH vector_results AS (
    SELECT 
      id,
      content,
      title,
      source,
      category,
      language,
      1 - (embedding <=> query_embedding) AS vec_sim,
      ts_rank(ts, plainto_tsquery('simple', query_text)) AS txt_rank
    FROM public.health_documents
    WHERE embedding IS NOT NULL
  ),
  normalized AS (
    SELECT 
      *,
      -- Normalize scores to 0-1 range
      vec_sim AS norm_vec,
      CASE 
        WHEN MAX(txt_rank) OVER () > 0 
        THEN txt_rank / MAX(txt_rank) OVER ()
        ELSE 0 
      END AS norm_txt
    FROM vector_results
  )
  SELECT 
    id,
    content,
    title,
    source,
    category,
    language,
    norm_vec AS vector_similarity,
    norm_txt AS text_rank,
    (norm_vec * vector_weight + norm_txt * text_weight) AS hybrid_score
  FROM normalized
  WHERE (norm_vec * vector_weight + norm_txt * text_weight) >= 0.3
  ORDER BY hybrid_score DESC
  LIMIT match_count;
$$;

-- Trigger to update timestamp
CREATE OR REPLACE FUNCTION update_health_documents_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_health_documents_updated_at
  BEFORE UPDATE ON public.health_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_health_documents_timestamp();

-- Comments for documentation
COMMENT ON TABLE public.health_documents IS 'RAG knowledge base with embeddings for semantic search';
COMMENT ON COLUMN public.health_documents.embedding IS '768-dim vector from embedding_model';
COMMENT ON COLUMN public.health_documents.chunk_index IS 'Position of chunk in original document (0-indexed)';
COMMENT ON FUNCTION match_health_documents IS 'Vector similarity search using cosine distance';
COMMENT ON FUNCTION hybrid_search_health_documents IS 'Hybrid search combining vector similarity and BM25 text ranking';

