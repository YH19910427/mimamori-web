-- L3 ベクトル検索マイグレーション
-- Supabase の SQL エディタで順番に実行してください。
-- ステップ3（HNSW インデックス）は backfill-embeddings.ts 実行後に行うこと。

-- ステップ1: pgvector 拡張を有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- ステップ2: documents テーブルに embedding カラムを追加
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS embedding VECTOR(768);

-- ステップ3: match_documents RPC 関数（コサイン類似度検索）
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(768),
  match_count     INT DEFAULT 10,
  match_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id           UUID,
  title        TEXT,
  category     TEXT,
  summary      TEXT,
  content      TEXT,
  source_date  TEXT,
  tags         TEXT[],
  key_facts    JSONB,
  created_at   TIMESTAMPTZ,
  similarity   FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    id, title, category, summary, content,
    source_date, tags, key_facts, created_at,
    1 - (embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) >= match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ステップ4: HNSW インデックス（backfill 完了後に実行）
-- バックフィル前に作成すると性能が低下するため、後で実行すること。
--
-- CREATE INDEX documents_embedding_hnsw
--   ON documents
--   USING hnsw (embedding vector_cosine_ops)
--   WITH (m = 16, ef_construction = 64);
