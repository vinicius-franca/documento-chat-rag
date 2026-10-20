import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { BookIndexingWorker } from './book-indexing.worker.js';
import { indexingQueueKey, type IndexingJob } from './indexing-queue.js';

@Injectable()
export class RedisIndexingConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly redis = new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
  });
  private running = false;
  private consuming: Promise<void> | undefined;

  constructor(private readonly worker: BookIndexingWorker) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    this.running = true;
    this.consuming = this.consume();
  }

  async onModuleDestroy(): Promise<void> {
    this.running = false;
    this.redis.disconnect();
    await this.consuming?.catch(() => undefined);
  }

  private async consume(): Promise<void> {
    while (this.running) {
      try {
        const entry = await this.redis.brpop(indexingQueueKey, 1);
        if (!entry) {
          continue;
        }
        const job = JSON.parse(entry[1]) as IndexingJob;
        await this.worker.process(job.bookId);
      } catch (error) {
        if (this.running) {
          console.error('Falha no consumidor de indexação.', error);
        }
      }
    }
  }
}
