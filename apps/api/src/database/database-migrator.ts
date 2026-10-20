import type { Pool } from 'pg';
import { createBooksMigration } from './migrations/001-create-books.migration.js';

const migrations = [createBooksMigration];

export class DatabaseMigrator {
  constructor(private readonly pool: Pool) {}

  async migrate(): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id TEXT PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      for (const migration of migrations) {
        const { rowCount } = await client.query<{ id: string }>(
          'SELECT id FROM schema_migrations WHERE id = $1',
          [migration.id],
        );

        if (rowCount === 0) {
          await client.query(migration.sql);
          await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [migration.id]);
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
