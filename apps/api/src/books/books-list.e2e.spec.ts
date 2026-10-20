import { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../app.module.js';

describe('GET /books', () => {
  let app: INestApplication<App>;
  let database: Pool;
  const createdIds: string[] = [];

  beforeAll(async () => {
    database = new Pool({
      host: process.env.POSTGRES_HOST ?? 'localhost',
      port: Number(process.env.POSTGRES_PORT ?? 5432),
      database: process.env.POSTGRES_DB ?? 'livrochat',
      user: process.env.POSTGRES_USER ?? 'livrochat',
      password: process.env.POSTGRES_PASSWORD ?? 'livrochat',
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (createdIds.length > 0) {
      await database.query('DELETE FROM books WHERE id = ANY($1::uuid[])', [createdIds]);
    }
    await database.end();
    await app?.close();
  });

  it('retorna os dados da biblioteca do mais recente para o mais antigo', async () => {
    const olderId = await createBook({
      title: 'Livro anterior',
      status: 'ready',
      pageCount: 42,
      processingError: null,
      createdAt: '2026-01-01T10:00:00.000Z',
    });
    const newerId = await createBook({
      title: 'Livro com falha',
      status: 'failed',
      pageCount: null,
      processingError: 'PDF sem texto extraível.',
      createdAt: '2026-01-02T10:00:00.000Z',
    });

    const response = await request(app.getHttpServer()).get('/books').expect(200);
    const listedBooks = response.body.filter((book: { id: string }) =>
      [olderId, newerId].includes(book.id),
    );

    expect(listedBooks).toEqual([
      {
        id: newerId,
        title: 'Livro com falha',
        pageCount: null,
        createdAt: '2026-01-02T10:00:00.000Z',
        status: 'failed',
        processingError: 'PDF sem texto extraível.',
      },
      {
        id: olderId,
        title: 'Livro anterior',
        pageCount: 42,
        createdAt: '2026-01-01T10:00:00.000Z',
        status: 'ready',
        processingError: null,
      },
    ]);
  });

  async function createBook(input: {
    title: string;
    status: 'ready' | 'failed';
    pageCount: number | null;
    processingError: string | null;
    createdAt: string;
  }): Promise<string> {
    const id = randomUUID();
    createdIds.push(id);
    await database.query(
      `
        INSERT INTO books (
          id, title, original_filename, storage_path, mime_type, size_bytes,
          page_count, status, processing_error, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
      `,
      [
        id,
        input.title,
        `${id}.pdf`,
        `storage/uploads/${id}.pdf`,
        'application/pdf',
        1,
        input.pageCount,
        input.status,
        input.processingError,
        input.createdAt,
      ],
    );
    return id;
  }
});
