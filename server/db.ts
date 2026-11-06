import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DB_PATH = process.env.DB_PATH ?? path.resolve('data', 'app.db');

mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  -- Mirrors the browser's former localStorage layout: one row per key, value
  -- kept as the exact string the frontend wrote, scoped per user.
  CREATE TABLE IF NOT EXISTS kv (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key     TEXT NOT NULL,
    value   TEXT NOT NULL,
    PRIMARY KEY (user_id, key)
  );
`);

export function transaction<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
