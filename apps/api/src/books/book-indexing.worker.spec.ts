import type { Book, CreateBookInput } from './book.types.js';
import { fileURLToPath } from 'node:url';
import {
  BookIndexingWorker,
  PdfWithoutTextError,
  unsupportedScannedPdfMessage,
} from './book-indexing.worker.js';
import type { BookRepository } from './book-repository.js';
import type { BookFileStore } from './file-storage.service.js';
import { PdfTextExtractionWorker } from './pdf-text-extraction.worker.js';
import { PageChunkingService } from './page-chunking.service.js';
import type { EmbeddingProvider } from './embedding-provider.js';
import type { ChunkVectorStore, VectorChunk } from './qdrant-chunk-store.js';

const fixtureRoot = new URL(
  '../../../../test/fixtures/corpus/',
  import.meta.url,
);

describe('BookIndexingWorker', () => {
  it('transiciona uploaded para processing e ready quando encontra texto por página', async () => {
    const repository = new InMemoryBookRepository();
    const book = repository.seed('caderno-rag-experimental.pdf');
    const vectorStore = new InMemoryVectorStore();
    const worker = new BookIndexingWorker(
      repository,
      fixtureStore(),
      new PdfTextExtractionWorker(),
      new PageChunkingService(),
      new FakeEmbeddingProvider(),
      vectorStore,
    );

    const result = await worker.process(book.id);

    expect(result.pages).toHaveLength(12);
    expect(result.chunks).not.toHaveLength(0);
    expect(vectorStore.chunks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          bookId: book.id,
          vector: [0.1, 0.2, 0.3, 0.4],
          pageStart: 1,
          pageEnd: expect.any(Number),
          text: expect.any(String),
        }),
      ]),
    );
    expect(result.book).toMatchObject({ status: 'ready', pageCount: 12 });
    expect(repository.transitions).toEqual(['processing', 'ready']);
  });

  it('marca failed e explica a limitação para PDF sem texto extraível', async () => {
    const repository = new InMemoryBookRepository();
    const book = repository.seed('caderno-sem-texto.pdf');
    const worker = new BookIndexingWorker(
      repository,
      fixtureStore(),
      new PdfTextExtractionWorker(),
      new PageChunkingService(),
      new FakeEmbeddingProvider(),
      new InMemoryVectorStore(),
    );

    await expect(worker.process(book.id)).rejects.toBeInstanceOf(
      PdfWithoutTextError,
    );
    expect(repository.current).toMatchObject({
      status: 'failed',
      processingError: unsupportedScannedPdfMessage,
    });
    expect(repository.transitions).toEqual(['processing', 'failed']);
  });

  it('não altera vetores quando a geração de embeddings falha', async () => {
    const repository = new InMemoryBookRepository();
    const book = repository.seed('caderno-rag-experimental.pdf');
    const vectorStore = new InMemoryVectorStore();
    const failure = new Error('Falha no provedor');
    const failingEmbeddings: EmbeddingProvider = {
      embed: async () => {
        throw failure;
      },
    };
    const worker = new BookIndexingWorker(
      repository,
      fixtureStore(),
      new PdfTextExtractionWorker(),
      new PageChunkingService(),
      failingEmbeddings,
      vectorStore,
    );

    await expect(worker.process(book.id)).rejects.toBe(failure);
    expect(repository.current).toMatchObject({
      status: 'failed',
      pageCount: null,
      processingError: 'Falha durante a indexação do PDF.',
    });
    expect(repository.transitions).toEqual(['processing', 'failed']);
    expect(vectorStore.removeCalls).toEqual([]);
    expect(vectorStore.upsertCalls).toBe(0);
    expect(vectorStore.chunks).toEqual([]);
  });
});

function fixtureStore(): BookFileStore {
  return {
    getAbsolutePath: (path) => fileURLToPath(new URL(path, fixtureRoot)),
  };
}

class InMemoryBookRepository implements BookRepository {
  current!: Book;
  transitions: string[] = [];

  seed(fileName: string): Book {
    this.current = {
      id: 'book-123',
      title: fileName,
      originalFilename: fileName,
      storagePath: fileName,
      mimeType: 'application/pdf',
      sizeBytes: 1,
      pageCount: null,
      status: 'uploaded',
      processingError: null,
      indexingJobId: 'job-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return this.current;
  }

  async create(_input: CreateBookInput): Promise<Book> {
    return this.current;
  }

  async list(): Promise<Book[]> {
    return [this.current];
  }

  async assignIndexingJob(_id: string, _indexingJobId: string): Promise<Book> {
    return this.current;
  }

  async findById(_id: string): Promise<Book> {
    return this.current;
  }

  async markProcessing(_id: string, _indexingJobId: string): Promise<Book> {
    this.transitions.push('processing');
    this.current = { ...this.current, status: 'processing' };
    return this.current;
  }

  async markReady(_id: string, pageCount: number): Promise<Book> {
    this.transitions.push('ready');
    this.current = { ...this.current, status: 'ready', pageCount };
    return this.current;
  }

  async markFailed(_id: string, processingError: string): Promise<Book> {
    this.transitions.push('failed');
    this.current = { ...this.current, status: 'failed', processingError };
    return this.current;
  }
}

class FakeEmbeddingProvider implements EmbeddingProvider {
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map(() => [0.1, 0.2, 0.3, 0.4]);
  }
}

class InMemoryVectorStore implements ChunkVectorStore {
  chunks: VectorChunk[] = [];
  removeCalls: string[] = [];
  upsertCalls = 0;

  async upsert(chunks: VectorChunk[]): Promise<void> {
    this.upsertCalls += 1;
    this.chunks.push(...chunks);
  }

  async removeByBookId(bookId: string): Promise<void> {
    this.removeCalls.push(bookId);
    this.chunks = this.chunks.filter((chunk) => chunk.bookId !== bookId);
  }

  async search(): Promise<never[]> {
    return [];
  }
}
