import type { Book, CreateBookInput } from './book.types.js';

export const BOOK_REPOSITORY = Symbol('BOOK_REPOSITORY');

export interface BookRepository {
  create(input: CreateBookInput): Promise<Book>;
  list(): Promise<Book[]>;
  assignIndexingJob(id: string, indexingJobId: string): Promise<Book | null>;
  findById(id: string): Promise<Book | null>;
  markProcessing(id: string, indexingJobId: string): Promise<Book | null>;
  markReady(id: string, pageCount: number): Promise<Book | null>;
  markFailed(id: string, processingError: string): Promise<Book | null>;
}
