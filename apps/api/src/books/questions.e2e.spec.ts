import { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../app.module.js';
import type { Book, CreateBookInput } from './book.types.js';
import { BOOK_REPOSITORY, type BookRepository } from './book-repository.js';
import { EMBEDDING_PROVIDER, type EmbeddingProvider } from './embedding-provider.js';
import { GENERATION_PROVIDER, type GenerationProvider } from './generation-provider.js';
import { BookVectorSearchService } from './book-vector-search.service.js';
import type { VectorSearchResult } from './qdrant-chunk-store.js';

describe('POST /questions', () => {
  let app: INestApplication<App>;
  let retrievedChunks: VectorSearchResult[];
  let generationCalls: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(BOOK_REPOSITORY)
      .useValue(repositoryWith([book('book-ready', 'Caderno RAG')]))
      .overrideProvider(EMBEDDING_PROVIDER)
      .useValue({ embed: async () => [[1, 0, 0, 0]] } satisfies EmbeddingProvider)
      .overrideProvider(BookVectorSearchService)
      .useValue({ search: async () => retrievedChunks })
      .overrideProvider(GENERATION_PROVIDER)
      .useValue({
        generate: async () => {
          generationCalls += 1;
          return {
            answer: 'RAG recupera trechos antes de gerar a resposta.',
            sourceChunkIds: ['chunk-1'],
            insufficientContext: false,
          };
        },
      } satisfies GenerationProvider)
      .compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    retrievedChunks = [chunk()];
    generationCalls = 0;
  });

  it('monta a resposta com título, páginas e excerto da fonte recuperada', async () => {
    await request(app.getHttpServer())
      .post('/questions')
      .send({ question: 'O que é RAG?', bookIds: ['book-ready'] })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual({
          answer: 'RAG recupera trechos antes de gerar a resposta.',
          insufficientContext: false,
          sources: [
            {
              chunkId: 'chunk-1',
              bookId: 'book-ready',
              title: 'Caderno RAG',
              pageStart: 2,
              pageEnd: 3,
              excerpt: 'RAG recupera trechos antes de gerar a resposta.',
            },
          ],
        });
      });
  });

  it('não gera afirmação quando não há evidência recuperada', async () => {
    retrievedChunks = [];

    await request(app.getHttpServer())
      .post('/questions')
      .send({ question: 'Qual é a capital da França?' })
      .expect(201)
      .expect({
        answer:
          'Não encontrei evidência suficiente nos livros selecionados. Selecione ou envie outro livro.',
        insufficientContext: true,
        sources: [],
      });

    expect(generationCalls).toBe(0);
  });
});

function chunk(): VectorSearchResult {
  return {
    id: 'chunk-1',
    bookId: 'book-ready',
    text: 'RAG recupera trechos antes de gerar a resposta.',
    pageStart: 2,
    pageEnd: 3,
    score: 0.9,
  };
}

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

function book(id: string, title: string): Book {
  return {
    id,
    title,
    originalFilename: `${id}.pdf`,
    storagePath: `${id}.pdf`,
    mimeType: 'application/pdf',
    sizeBytes: 1,
    pageCount: 3,
    status: 'ready',
    processingError: null,
    indexingJobId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
