import {closeSync, mkdirSync, openSync} from 'node:fs';
import {join, resolve} from 'node:path';

import Database from 'better-sqlite3';
import {drizzle, type BetterSQLite3Database} from 'drizzle-orm/better-sqlite3';
import {index, sqliteTable, text} from 'drizzle-orm/sqlite-core';

export const publications = sqliteTable(
  'publications',
  {
    /**
     * Stable ID for a (filePath, platformId) record.
     * Suggested format: `${platformId}::${encodeURIComponent(filePath)}`
     */
    id: text('id').primaryKey(),

    /**
     * Absolute file path (within workspace).
     */
    filePath: text('file_path').notNull(),

    platformId: text('platform_id').notNull(),
    platformName: text('platform_name').notNull(),

    /**
     * Local app's last submission time (ISO string).
     *
     * NOTE: this is NOT the "remote latest" timestamp; they can differ.
     */
    lastLocalSubmittedAt: text('last_local_submitted_at').notNull(),

    /**
     * Reserved for future extensions (store minimal per-file info required by
     * expected features), serialized as JSON.
     */
    metadataJson: text('metadata_json').notNull(),
  },
  t => [
    index('publications_file_path_idx').on(t.filePath),
    index('publications_platform_id_idx').on(t.platformId),
  ],
);

export type PublicationRow = typeof publications.$inferSelect;
export type PublicationRowInsert = typeof publications.$inferInsert;

export type WorkspaceDb = {
  sqliteFilePath: string;
  sqlite: Database.Database;
  db: BetterSQLite3Database<{
    publications: typeof publications;
  }>;
};

const dbCache = new Map<string, WorkspaceDb>();

function ensureWorkspaceSqliteFile(workspaceRoot: string): string {
  const root = resolve(String(workspaceRoot ?? '').trim());
  if (!root) throw new Error('workspaceRoot is required.');

  const dir = join(root, '.polypress');
  mkdirSync(dir, {recursive: true});

  const filePath = join(dir, 'database.db');

  // Ensure the sqlite file exists on disk (helps diagnose permission issues and
  // avoids "dir exists but db file not created" confusion).
  try {
    const fd = openSync(filePath, 'a');
    closeSync(fd);
  } catch (e) {
    throw new Error(
      `Failed to create sqlite file at "${filePath}": ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  }

  return filePath;
}

function initSchema(sqlite: Database.Database) {
  // Pragmas (safe defaults for desktop apps)
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // Drizzle does not auto-create tables; keep a minimal bootstrap here.
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS publications (
      id TEXT PRIMARY KEY NOT NULL,
      file_path TEXT NOT NULL,
      platform_id TEXT NOT NULL,
      platform_name TEXT NOT NULL,
      last_local_submitted_at TEXT NOT NULL,
      metadata_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS publications_file_path_idx
      ON publications(file_path);

    CREATE INDEX IF NOT EXISTS publications_platform_id_idx
      ON publications(platform_id);
  `);

  // Lightweight migration for existing workspaces created before `remote_url`.
  // (No-op if the column already exists.)
  try {
    sqlite.exec(
      `ALTER TABLE publications ADD COLUMN remote_url TEXT NOT NULL DEFAULT '';`,
    );
  } catch {
    // ignore
  }
}

export function getWorkspaceDb(workspaceRoot: string): WorkspaceDb {
  const key = resolve(String(workspaceRoot ?? '').trim());
  if (!key) throw new Error('workspaceRoot is required.');

  const cached = dbCache.get(key);
  if (cached) return cached;

  const t0 = Date.now();
  console.log('[db] getWorkspaceDb open start', {workspaceRoot: key});
  const sqliteFilePath = ensureWorkspaceSqliteFile(key);
  console.log('[db] sqlite file ensured', {sqliteFilePath});
  const sqlite = new Database(sqliteFilePath);
  console.log('[db] sqlite opened', {ms: Date.now() - t0});
  initSchema(sqlite);
  console.log('[db] schema ready', {ms: Date.now() - t0});

  const db = drizzle(sqlite, {
    schema: {
      publications,
    },
  });

  const wsDb: WorkspaceDb = {sqliteFilePath, sqlite, db};
  dbCache.set(key, wsDb);
  console.log('[db] getWorkspaceDb cached', {ms: Date.now() - t0});
  return wsDb;
}

export function closeAllWorkspaceDbs() {
  for (const [, ws] of dbCache) {
    try {
      ws.sqlite.close();
    } catch {
      // ignore
    }
  }
  dbCache.clear();
}
