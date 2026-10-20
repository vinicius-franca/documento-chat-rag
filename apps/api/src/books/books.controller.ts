import {
  Controller,
  Get,
  Inject,
  Post,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterExceptionFilter } from './multer-exception.filter.js';
import { UploadValidationService, type UploadedFile as UploadedPdf } from './upload-validation.service.js';
import { BookIngestionService } from './book-ingestion.service.js';
import { BOOK_REPOSITORY, type BookRepository } from './book-repository.js';

@Controller('books')
@UseFilters(MulterExceptionFilter)
export class BooksController {
  constructor(
    private readonly uploadValidation: UploadValidationService,
    private readonly ingestion: BookIngestionService,
    @Inject(BOOK_REPOSITORY) private readonly books: BookRepository,
  ) {}

  @Get()
  async list() {
    const books = await this.books.list();
    return books.map((book) => ({
      id: book.id,
      title: book.title,
      pageCount: book.pageCount,
      createdAt: book.createdAt,
      status: book.status,
      processingError: book.processingError,
    }));
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: UploadedPdf | undefined) {
    const validatedFile = this.uploadValidation.validate(file);
    return this.ingestion.accept(validatedFile);
  }
}
