import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { db } from './db.ts';

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const KEY_LENGTH = 64;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface User {
  id: number;
  username: string;
}

// Stored as `scrypt$<salt hex>$<hash hex>` so the format can change later
// without guessing what an old row contains.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

// Hashed against when the username doesn't exist, so a failed login takes
// the same time either way and doesn't reveal which usernames are taken.
const dummyHash = await hashPassword(randomBytes(16).toString('hex'));

export async function checkCredentials(username: string, password: string): Promise<User | null> {
  const row = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get(username) as
    | { id: number; username: string; password_hash: string }
    | undefined;
  const ok = await verifyPassword(password, row?.password_hash ?? dummyHash);
  return ok && row ? { id: row.id, username: row.username } : null;
}

// Only the token's hash is stored, so a leaked database can't be replayed
// as live sessions.
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function createSession(userId: number): string {
  const token = randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(
    hashToken(token),
    userId,
    Date.now() + SESSION_TTL_MS,
  );
  return token;
}

export function getSessionUser(token: string): User | null {
  const row = db
    .prepare(
      `SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(hashToken(token), Date.now()) as User | undefined;
  return row ?? null;
}

export function deleteSession(token: string): void {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

export function deleteExpiredSessions(): void {
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
}

// In-memory throttle per username: enough to stop online password guessing
// for a handful of accounts, and resets with the process, which is fine here.
const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; since: number }>();

export function isLockedOut(username: string): boolean {
  const entry = failures.get(username.toLowerCase());
  if (!entry) return false;
  if (Date.now() - entry.since > LOCKOUT_MS) {
    failures.delete(username.toLowerCase());
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

export function recordFailure(username: string): void {
  const key = username.toLowerCase();
  const entry = failures.get(key);
  if (!entry || Date.now() - entry.since > LOCKOUT_MS) failures.set(key, { count: 1, since: Date.now() });
  else entry.count++;
}

export function clearFailures(username: string): void {
  failures.delete(username.toLowerCase());
}
