import { Inject, Injectable } from '@nestjs/common';
import type { Book } from './book.types.js';
import { FILE_STORAGE, FileStorageService } from './file-storage.service.js';
import { INDEXING_QUEUE, type IndexingQueue } from './indexing-queue.js';
import { BOOK_REPOSITORY, type BookRepository } from './book-repository.js';
import type { UploadedFile } from './upload-validation.service.js';

@Injectable()
export class BookIngestionService {
  constructor(
    @Inject(BOOK_REPOSITORY) private readonly books: BookRepository,
    @Inject(FILE_STORAGE) private readonly storage: FileStorageService,
    @Inject(INDEXING_QUEUE) private readonly queue: IndexingQueue,
  ) {}

  async accept(file: UploadedFile): Promise<Book> {
    const storedFile = await this.storage.store(file);
    const book = await this.books.create({
      title: titleFromFileName(file.originalname),
      originalFilename: file.originalname,
      storagePath: storedFile.relativePath,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });

    const indexingJobId = await this.queue.publish({ bookId: book.id });
    return (await this.books.assignIndexingJob(book.id, indexingJobId)) ?? book;
  }
}

function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.pdf$/i, '').trim() || 'Livro sem título';
}
