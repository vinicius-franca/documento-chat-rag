import { Inject, Injectable } from '@nestjs/common';
import { BOOK_REPOSITORY, type BookRepository } from './book-repository.js';
import { CHUNK_VECTOR_STORE, type ChunkVectorStore, type VectorSearchResult } from './qdrant-chunk-store.js';

const defaultTopK = 6;

@Injectable()
export class BookVectorSearchService {
  constructor(
    @Inject(BOOK_REPOSITORY) private readonly books: BookRepository,
    @Inject(CHUNK_VECTOR_STORE) private readonly vectors: ChunkVectorStore,
  ) {}

  async search(queryVector: number[], requestedBookIds?: string[]): Promise<VectorSearchResult[]> {
    const requestedIds = requestedBookIds ? new Set(requestedBookIds) : undefined;
    const readyBookIds = (await this.books.list())
      .filter((book) => book.status === 'ready' && (!requestedIds || requestedIds.has(book.id)))
      .map((book) => book.id);

    return this.vectors.search(queryVector, getTopK(), readyBookIds);
  }
}

function getTopK(): number {
  const configuredValue = Number(process.env.RAG_TOP_K ?? defaultTopK);
  return Number.isSafeInteger(configuredValue) && configuredValue > 0 ? configuredValue : defaultTopK;
}
