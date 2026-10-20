import { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../app.module.js';
import { BookIngestionService } from './book-ingestion.service.js';
import type { UploadedFile } from './upload-validation.service.js';

describe('POST /books/upload', () => {
  let app: INestApplication<App>;
  const previousLimit = process.env.MAX_UPLOAD_SIZE_BYTES;

  beforeEach(async () => {
    process.env.MAX_UPLOAD_SIZE_BYTES = '16';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(BookIngestionService)
      .useValue({
        accept: (file: UploadedFile) =>
          Promise.resolve({
            id: 'book-123',
            title: file.originalname.replace(/\.pdf$/i, ''),
            originalFilename: file.originalname,
            storagePath: 'storage/uploads/book-123.pdf',
            mimeType: file.mimetype,
            sizeBytes: file.size,
            pageCount: null,
            status: 'uploaded',
            processingError: null,
            indexingJobId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    process.env.MAX_UPLOAD_SIZE_BYTES = previousLimit;
  });

  it('aceita um PDF dentro do limite configurado', async () => {
    await request(app.getHttpServer())
      .post('/books/upload')
      .attach('file', Buffer.from('%PDF-1.4'), {
        filename: 'livro.pdf',
        contentType: 'application/pdf',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          title: 'livro',
          originalFilename: 'livro.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 8,
          status: 'uploaded',
        });
      });
  });

  it('rejeita arquivo com extensão diferente de PDF', async () => {
    await request(app.getHttpServer())
      .post('/books/upload')
      .attach('file', Buffer.from('%PDF-1.4'), {
        filename: 'livro.txt',
        contentType: 'application/pdf',
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe('A extensão do arquivo deve ser .pdf.');
      });
  });

  it('rejeita arquivo com MIME diferente de application/pdf', async () => {
    await request(app.getHttpServer())
      .post('/books/upload')
      .attach('file', Buffer.from('texto'), {
        filename: 'livro.pdf',
        contentType: 'text/plain',
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe('O tipo MIME do arquivo deve ser application/pdf.');
      });
  });

  it('rejeita arquivo que excede o limite configurado', async () => {
    await request(app.getHttpServer())
      .post('/books/upload')
      .attach('file', Buffer.alloc(17), {
        filename: 'livro.pdf',
        contentType: 'application/pdf',
      })
      .expect(413)
      .expect(({ body }) => {
        expect(body.message).toBe('O arquivo excede o limite configurado.');
      });
  });
});
