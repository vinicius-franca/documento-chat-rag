import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import type { Pool } from 'pg';
import { DatabaseMigrator } from './database-migrator.js';
import { POSTGRES_POOL } from './database.tokens.js';

@Injectable()
export class DatabaseLifecycleService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    private readonly migrator: DatabaseMigrator,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.migrator.migrate();
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
