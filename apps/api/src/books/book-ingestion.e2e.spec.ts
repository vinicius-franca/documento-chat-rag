import { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Redis } from 'ioredis';
import { Pool } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../app.module.js';
import { indexingQueueKey, type IndexingJob } from './indexing-queue.js';

describe('POST /books/upload persistence', () => {
  let app: INestApplication<App>;
  let database: Pool;
  let redis: Redis;
  let createdBookId: string | undefined;
  let storedPath: string | undefined;

  beforeAll(async () => {
    database = new Pool({
      host: process.env.POSTGRES_HOST ?? 'localhost',
      port: Number(process.env.POSTGRES_PORT ?? 5432),
      database: process.env.POSTGRES_DB ?? 'livrochat',
      user: process.env.POSTGRES_USER ?? 'livrochat',
      password: process.env.POSTGRES_PASSWORD ?? 'livrochat',
    });
    redis = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
    });
    await redis.del(indexingQueueKey);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (createdBookId) {
      await database.query('DELETE FROM books WHERE id = $1', [createdBookId]);
    }
    if (storedPath) {
      await rm(resolve(fileURLToPath(new URL('../../../../', import.meta.url)), storedPath), {
        force: true,
      });
    }
    await redis.quit();
    await database.end();
    await app.close();
  });

  it('persiste o arquivo e retorna antes do processamento de indexação', async () => {
    const response = await request(app.getHttpServer())
      .post('/books/upload')
      .attach('file', Buffer.from('%PDF-1.4 fixture'), {
        filename: 'caderno-rag.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    createdBookId = response.body.id;
    storedPath = response.body.storagePath;
    expect(response.body).toMatchObject({
      title: 'caderno-rag',
      status: 'uploaded',
      originalFilename: 'caderno-rag.pdf',
    });

    const persisted = await database.query<{ status: string; indexing_job_id: string }>(
      'SELECT status, indexing_job_id FROM books WHERE id = $1',
      [createdBookId],
    );
    expect(persisted.rows[0]).toMatchObject({ status: 'uploaded' });

    const serializedJob = await redis.rpop(indexingQueueKey);
    expect(serializedJob).not.toBeNull();
    expect(JSON.parse(serializedJob ?? '{}') as IndexingJob).toMatchObject({ bookId: createdBookId });
  });
});
