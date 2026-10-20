import { randomUUID } from 'node:crypto';
import { QdrantClient } from '@qdrant/js-client-rest';
import type { Book, CreateBookInput } from './book.types.js';
import type { BookRepository } from './book-repository.js';
import { BookVectorSearchService } from './book-vector-search.service.js';
import { QdrantChunkStore } from './qdrant-chunk-store.js';

describe('BookVectorSearchService', () => {
  const collectionName = `book_search_test_${randomUUID().replaceAll('-', '_')}`;
  const host = process.env.QDRANT_HOST ?? 'localhost';
  const port = Number(process.env.QDRANT_PORT ?? 6333);
  const store = new QdrantChunkStore({ host, port, collectionName, vectorSize: 4 });
  const client = new QdrantClient({ host, port });

  afterAll(async () => {
    const { exists } = await client.collectionExists(collectionName);
    if (exists) {
      await client.deleteCollection(collectionName);
    }
  });

  it('não retorna vetores de livros que não estão ready', async () => {
    await store.upsert([
      {
        id: randomUUID(),
        vector: [1, 0, 0, 0],
        bookId: 'book-ready',
        text: 'Conteúdo disponível',
        pageStart: 1,
        pageEnd: 1,
      },
      {
        id: randomUUID(),
        vector: [1, 0, 0, 0],
        bookId: 'book-processing',
        text: 'Conteúdo ainda indisponível',
        pageStart: 1,
        pageEnd: 1,
      },
    ]);
    const service = new BookVectorSearchService(
      repositoryWith([
        book('book-ready', 'ready'),
        book('book-processing', 'processing'),
      ]),
      store,
    );

    const results = await service.search([1, 0, 0, 0], ['book-ready', 'book-processing']);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ bookId: 'book-ready', text: 'Conteúdo disponível' });
  });
});

function repositoryWith(books: Book[]): BookRepository {
  return {
    list: async () => books,
    create: async (_input: CreateBookInput) => books[0],
    assignIndexingJob: async () => books[0],
    findById: async (id: string) => books.find((book) => book.id === id) ?? null,
    markProcessing: async () => books[0],
    markReady: async () => books[0],
    markFailed: async () => books[0],
  };
}

function book(id: string, status: Book['status']): Book {
  return {
    id,
    title: id,
    originalFilename: `${id}.pdf`,
    storagePath: `${id}.pdf`,
    mimeType: 'application/pdf',
    sizeBytes: 1,
    pageCount: 1,
    status,
    processingError: null,
    indexingJobId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
