export const createBooksMigration = {
  id: '001-create-books',
  sql: `
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS books (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      storage_path TEXT NOT NULL UNIQUE,
      mime_type TEXT NOT NULL,
      size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
      page_count INTEGER CHECK (page_count IS NULL OR page_count >= 0),
      status TEXT NOT NULL CHECK (status IN ('uploaded', 'processing', 'ready', 'failed')),
      processing_error TEXT,
      indexing_job_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS books_status_created_at_idx
      ON books (status, created_at DESC);
  `,
} as const;
