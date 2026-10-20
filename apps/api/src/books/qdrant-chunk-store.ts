import { QdrantClient } from '@qdrant/js-client-rest';

export interface VectorChunk {
  id: string;
  vector: number[];
  bookId: string;
  text: string;
  pageStart: number;
  pageEnd: number;
}

export const CHUNK_VECTOR_STORE = Symbol('CHUNK_VECTOR_STORE');

export interface ChunkVectorStore {
  upsert(chunks: VectorChunk[]): Promise<void>;
  removeByBookId(bookId: string): Promise<void>;
  search(queryVector: number[], limit: number, bookIds: string[]): Promise<VectorSearchResult[]>;
}

export interface VectorSearchResult {
  id: string;
  bookId: string;
  text: string;
  pageStart: number;
  pageEnd: number;
  score: number;
}

export interface QdrantChunkStoreOptions {
  host: string;
  port: number;
  collectionName: string;
  vectorSize: number;
}

export function getQdrantChunkStoreOptions(): QdrantChunkStoreOptions {
  return {
    host: process.env.QDRANT_HOST ?? 'localhost',
    port: positiveInteger(process.env.QDRANT_PORT, 6333),
    collectionName: process.env.QDRANT_COLLECTION ?? 'book_chunks',
    vectorSize: positiveInteger(process.env.EMBEDDING_DIMENSIONS, 1536),
  };
}

export class QdrantChunkStore implements ChunkVectorStore {
  private readonly client: QdrantClient;

  constructor(private readonly options: QdrantChunkStoreOptions = getQdrantChunkStoreOptions()) {
    this.client = new QdrantClient({ host: options.host, port: options.port });
  }

  async initialize(): Promise<void> {
    const { exists } = await this.client.collectionExists(this.options.collectionName);
    if (exists) {
      return;
    }

    await this.client.createCollection(this.options.collectionName, {
      vectors: { size: this.options.vectorSize, distance: 'Cosine' },
    });
    await this.client.createPayloadIndex(this.options.collectionName, {
      field_name: 'bookId',
      field_schema: 'keyword',
      wait: true,
    });
  }

  async upsert(chunks: VectorChunk[]): Promise<void> {
    if (chunks.length === 0) {
      return;
    }

    this.assertVectorSizes(chunks);
    await this.initialize();
    await this.client.upsert(this.options.collectionName, {
      wait: true,
      points: chunks.map((chunk) => ({
        id: chunk.id,
        vector: chunk.vector,
        payload: {
          bookId: chunk.bookId,
          text: chunk.text,
          pageStart: chunk.pageStart,
          pageEnd: chunk.pageEnd,
        },
      })),
    });
  }

  async removeByBookId(bookId: string): Promise<void> {
    await this.initialize();
    await this.client.delete(this.options.collectionName, {
      wait: true,
      filter: byBookId(bookId),
    });
  }

  async listByBookId(bookId: string): Promise<VectorChunk[]> {
    await this.initialize();
    const result = await this.client.scroll(this.options.collectionName, {
      filter: byBookId(bookId),
      with_payload: true,
      with_vector: true,
      limit: 100,
    });

    return result.points.map((point) => {
      const payload = point.payload ?? {};
      const vector = isDenseVector(point.vector) ? point.vector : [];

      return {
        id: String(point.id),
        vector,
        bookId: String(payload.bookId),
        text: String(payload.text),
        pageStart: Number(payload.pageStart),
        pageEnd: Number(payload.pageEnd),
      };
    });
  }

  async search(queryVector: number[], limit: number, bookIds: string[]): Promise<VectorSearchResult[]> {
    if (bookIds.length === 0) {
      return [];
    }

    this.assertVectorSizes([{ vector: queryVector } as VectorChunk]);
    await this.initialize();
    const result = await this.client.query(this.options.collectionName, {
      query: queryVector,
      limit,
      filter: byBookIds(bookIds),
      with_payload: true,
    });

    return result.points.map((point) => {
      const payload = point.payload ?? {};

      return {
        id: String(point.id),
        bookId: String(payload.bookId),
        text: String(payload.text),
        pageStart: Number(payload.pageStart),
        pageEnd: Number(payload.pageEnd),
        score: point.score,
      };
    });
  }

  private assertVectorSizes(chunks: VectorChunk[]): void {
    if (chunks.some((chunk) => chunk.vector.length !== this.options.vectorSize)) {
      throw new Error(`Os vetores devem ter ${this.options.vectorSize} dimensões.`);
    }
  }
}

function byBookId(bookId: string) {
  return { must: [{ key: 'bookId', match: { value: bookId } }] };
}

function byBookIds(bookIds: string[]) {
  return { must: [{ key: 'bookId', match: { any: bookIds } }] };
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function isDenseVector(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number');
}
