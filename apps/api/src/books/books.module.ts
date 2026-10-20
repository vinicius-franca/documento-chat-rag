import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { DatabaseMigrator } from '../database/database-migrator.js';
import { DatabaseLifecycleService } from '../database/database-lifecycle.service.js';
import { createPostgresPool } from '../database/postgres.config.js';
import { POSTGRES_POOL } from '../database/database.tokens.js';
import { BookIngestionService } from './book-ingestion.service.js';
import { BOOK_REPOSITORY } from './book-repository.js';
import { BooksController } from './books.controller.js';
import { FILE_STORAGE, FileStorageService } from './file-storage.service.js';
import { INDEXING_QUEUE, RedisIndexingQueue } from './indexing-queue.js';
import { PostgresBookRepository } from './postgres-book.repository.js';
import { PdfTextExtractionWorker } from './pdf-text-extraction.worker.js';
import { BookIndexingWorker } from './book-indexing.worker.js';
import { PageChunkingService } from './page-chunking.service.js';
import { EMBEDDING_PROVIDER, OpenAiEmbeddingProvider } from './embedding-provider.js';
import { CHUNK_VECTOR_STORE, QdrantChunkStore } from './qdrant-chunk-store.js';
import { BookVectorSearchService } from './book-vector-search.service.js';
import { GENERATION_PROVIDER, OpenAiGenerationProvider } from './generation-provider.js';
import { QuestionAnswerService } from './question-answer.service.js';
import { QuestionsController } from './questions.controller.js';
import { RedisIndexingConsumer } from './redis-indexing.consumer.js';
import { getMaxUploadSizeBytes } from './upload-config.js';
import { UploadValidationService } from './upload-validation.service.js';

@Module({
  imports: [
    MulterModule.registerAsync({
      useFactory: () => ({
        limits: { fileSize: getMaxUploadSizeBytes() },
      }),
    }),
  ],
  controllers: [BooksController, QuestionsController],
  providers: [
    UploadValidationService,
    BookIngestionService,
    PdfTextExtractionWorker,
    PageChunkingService,
    BookIndexingWorker,
    BookVectorSearchService,
    QuestionAnswerService,
    RedisIndexingConsumer,
    DatabaseLifecycleService,
    { provide: POSTGRES_POOL, useFactory: createPostgresPool },
    {
      provide: DatabaseMigrator,
      inject: [POSTGRES_POOL],
      useFactory: (pool) => new DatabaseMigrator(pool),
    },
    {
      provide: BOOK_REPOSITORY,
      inject: [POSTGRES_POOL],
      useFactory: (pool) => new PostgresBookRepository(pool),
    },
    { provide: FILE_STORAGE, useClass: FileStorageService },
    { provide: INDEXING_QUEUE, useClass: RedisIndexingQueue },
    { provide: EMBEDDING_PROVIDER, useFactory: () => new OpenAiEmbeddingProvider() },
    { provide: GENERATION_PROVIDER, useFactory: () => new OpenAiGenerationProvider() },
    { provide: CHUNK_VECTOR_STORE, useFactory: () => new QdrantChunkStore() },
  ],
})
export class BooksModule {}
