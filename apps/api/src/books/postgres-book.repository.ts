import type { Pool } from 'pg';
import type { Book, BookProcessingStatus, CreateBookInput } from './book.types.js';

interface BookRow {
  id: string;
  title: string;
  original_filename: string;
  storage_path: string;
  mime_type: string;
  size_bytes: string;
  page_count: number | null;
  status: BookProcessingStatus;
  processing_error: string | null;
  indexing_job_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export class PostgresBookRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateBookInput): Promise<Book> {
    const { rows } = await this.pool.query<BookRow>(
      `
        INSERT INTO books (title, original_filename, storage_path, mime_type, size_bytes, status)
        VALUES ($1, $2, $3, $4, $5, 'uploaded')
        RETURNING *;
      `,
      [input.title, input.originalFilename, input.storagePath, input.mimeType, input.sizeBytes],
    );

    return mapBook(rows[0]);
  }

  async findById(id: string): Promise<Book | null> {
    const { rows } = await this.pool.query<BookRow>('SELECT * FROM books WHERE id = $1', [id]);
    return rows[0] ? mapBook(rows[0]) : null;
  }

  async list(): Promise<Book[]> {
    const { rows } = await this.pool.query<BookRow>(
      'SELECT * FROM books ORDER BY created_at DESC, id DESC',
    );
    return rows.map(mapBook);
  }

  async markProcessing(id: string, indexingJobId: string): Promise<Book | null> {
    return this.updateStatus(id, 'processing', { indexingJobId, processingError: null });
  }

  async assignIndexingJob(id: string, indexingJobId: string): Promise<Book | null> {
    const { rows } = await this.pool.query<BookRow>(
      `
        UPDATE books
        SET indexing_job_id = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING *;
      `,
      [id, indexingJobId],
    );

    return rows[0] ? mapBook(rows[0]) : null;
  }

  async markReady(id: string, pageCount: number): Promise<Book | null> {
    return this.updateStatus(id, 'ready', { pageCount, processingError: null });
  }

  async markFailed(id: string, processingError: string): Promise<Book | null> {
    return this.updateStatus(id, 'failed', { processingError });
  }

  private async updateStatus(
    id: string,
    status: BookProcessingStatus,
    changes: {
      indexingJobId?: string;
      pageCount?: number;
      processingError?: string | null;
    },
  ): Promise<Book | null> {
    const { rows } = await this.pool.query<BookRow>(
      `
        UPDATE books
        SET
          status = $2,
          indexing_job_id = COALESCE($3, indexing_job_id),
          page_count = COALESCE($4, page_count),
          processing_error = $5,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *;
      `,
      [id, status, changes.indexingJobId ?? null, changes.pageCount ?? null, changes.processingError ?? null],
    );

    return rows[0] ? mapBook(rows[0]) : null;
  }
}

function mapBook(row: BookRow): Book {
  return {
    id: row.id,
    title: row.title,
    originalFilename: row.original_filename,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    pageCount: row.page_count,
    status: row.status,
    processingError: row.processing_error,
    indexingJobId: row.indexing_job_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
