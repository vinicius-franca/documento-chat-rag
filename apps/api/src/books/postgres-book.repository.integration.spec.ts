import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DatabaseMigrator } from '../database/database-migrator.js';
import { createPostgresPool } from '../database/postgres.config.js';
import { PostgresBookRepository } from './postgres-book.repository.js';

const pool = createPostgresPool();
const migrator = new DatabaseMigrator(pool);
const repository = new PostgresBookRepository(pool);

describe('PostgresBookRepository', () => {
  beforeAll(async () => {
    await migrator.migrate();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('persiste metadados do livro e seu estado de processamento', async () => {
    const created = await repository.create({
      title: 'Caderno RAG Experimental',
      originalFilename: 'caderno-rag-experimental.pdf',
      storagePath: 'uploads/caderno-rag-experimental.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 5520,
    });

    try {
      expect(created.status).toBe('uploaded');
      expect(created.pageCount).toBeNull();

      const processing = await repository.markProcessing(created.id, 'job-123');
      expect(processing).toMatchObject({ status: 'processing', indexingJobId: 'job-123' });

      const failed = await repository.markFailed(created.id, 'PDF sem texto extraível');
      expect(failed).toMatchObject({
        status: 'failed',
        processingError: 'PDF sem texto extraível',
        originalFilename: 'caderno-rag-experimental.pdf',
      });

      await expect(repository.findById(created.id)).resolves.toMatchObject({ id: created.id });
    } finally {
      await pool.query('DELETE FROM books WHERE id = $1', [created.id]);
    }
  });
});
