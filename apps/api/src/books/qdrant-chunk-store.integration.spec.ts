import { randomUUID } from 'node:crypto';
import { QdrantClient } from '@qdrant/js-client-rest';
import { QdrantChunkStore } from './qdrant-chunk-store.js';

describe('QdrantChunkStore', () => {
  const collectionName = `book_chunks_test_${randomUUID().replaceAll('-', '_')}`;
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

  it('insere e remove somente os vetores do livro informado', async () => {
    await store.upsert([
      {
        id: randomUUID(),
        vector: [0.1, 0.2, 0.3, 0.4],
        bookId: 'book-a',
        text: 'Trecho do livro A',
        pageStart: 1,
        pageEnd: 2,
      },
      {
        id: randomUUID(),
        vector: [0.4, 0.3, 0.2, 0.1],
        bookId: 'book-b',
        text: 'Trecho do livro B',
        pageStart: 4,
        pageEnd: 4,
      },
    ]);

    expect(await store.listByBookId('book-a')).toMatchObject([
      { bookId: 'book-a', text: 'Trecho do livro A', pageStart: 1, pageEnd: 2 },
    ]);

    await store.removeByBookId('book-a');

    expect(await store.listByBookId('book-a')).toEqual([]);
    expect(await store.listByBookId('book-b')).toHaveLength(1);
  });
});
