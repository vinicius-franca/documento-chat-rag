import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';

export const INDEXING_QUEUE = Symbol('INDEXING_QUEUE');
const indexingQueueKey = 'book-indexing';

export interface IndexingJob {
  id: string;
  bookId: string;
}

export interface IndexingQueue {
  publish(job: Pick<IndexingJob, 'bookId'>): Promise<string>;
}

@Injectable()
export class RedisIndexingQueue implements IndexingQueue, OnModuleDestroy {
  private readonly redis = new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
  });

  async publish(job: Pick<IndexingJob, 'bookId'>): Promise<string> {
    const queuedJob: IndexingJob = { id: randomUUID(), bookId: job.bookId };
    await this.redis.lpush(indexingQueueKey, JSON.stringify(queuedJob));
    return queuedJob.id;
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}

export { indexingQueueKey };
