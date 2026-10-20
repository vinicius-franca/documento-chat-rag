import { Inject, Injectable } from '@nestjs/common';
import type { Book } from './book.types.js';
import { BOOK_REPOSITORY, type BookRepository } from './book-repository.js';
import { FILE_STORAGE, type BookFileStore } from './file-storage.service.js';
import { PdfTextExtractionWorker, type ExtractedPdfPage } from './pdf-text-extraction.worker.js';
import { PageChunkingService, type IndexableChunk } from './page-chunking.service.js';
import { EMBEDDING_PROVIDER, type EmbeddingProvider } from './embedding-provider.js';
import { CHUNK_VECTOR_STORE, type ChunkVectorStore } from './qdrant-chunk-store.js';
import { randomUUID } from 'node:crypto';

export const unsupportedScannedPdfMessage =
  'PDF sem texto extraível. PDFs escaneados não são suportados no MVP.';

export class PdfWithoutTextError extends Error {
  constructor() {
    super(unsupportedScannedPdfMessage);
  }
}

export interface IndexedBookPages {
  book: Book;
  pages: ExtractedPdfPage[];
  chunks: IndexableChunk[];
}

@Injectable()
export class BookIndexingWorker {
  constructor(
    @Inject(BOOK_REPOSITORY) private readonly books: BookRepository,
    @Inject(FILE_STORAGE) private readonly storage: BookFileStore,
    private readonly extractor: PdfTextExtractionWorker,
    private readonly chunking: PageChunkingService,
    @Inject(EMBEDDING_PROVIDER) private readonly embeddings: EmbeddingProvider,
    @Inject(CHUNK_VECTOR_STORE) private readonly vectorStore: ChunkVectorStore,
  ) {}

  async process(bookId: string): Promise<IndexedBookPages> {
    const book = await this.books.findById(bookId);
    if (!book) {
      throw new Error(`Livro ${bookId} não encontrado.`);
    }

    await this.books.markProcessing(book.id, book.indexingJobId ?? `manual-${book.id}`);

    try {
      const pages = await this.extractor.extract(this.storage.getAbsolutePath(book.storagePath));
      if (!pages.some((page) => page.text.length > 0)) {
        throw new PdfWithoutTextError();
      }

      const chunks = this.chunking.segment(book.id, pages);
      if (chunks.length === 0) {
        throw new PdfWithoutTextError();
      }

      const vectors = await this.embeddings.embed(chunks.map((chunk) => chunk.text));
      if (vectors.length !== chunks.length) {
        throw new Error('A quantidade de embeddings não corresponde à quantidade de chunks.');
      }
      await this.vectorStore.removeByBookId(book.id);
      await this.vectorStore.upsert(
        chunks.map((chunk, index) => ({ id: randomUUID(), vector: vectors[index], ...chunk })),
      );

      const readyBook = await this.books.markReady(book.id, pages.length);
      if (!readyBook) {
        throw new Error(`Livro ${book.id} não encontrado ao finalizar a indexação.`);
      }

      return { book: readyBook, pages, chunks };
    } catch (error) {
      const message = error instanceof PdfWithoutTextError ? error.message : 'Falha durante a indexação do PDF.';
      await this.books.markFailed(book.id, message);
      throw error;
    }
  }
}
