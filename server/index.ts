import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { csrf } from 'hono/csrf';
import { createMiddleware } from 'hono/factory';
import {
  checkCredentials,
  clearFailures,
  createSession,
  deleteExpiredSessions,
  deleteSession,
  getSessionUser,
  isLockedOut,
  recordFailure,
  SESSION_TTL_MS,
  type User,
} from './auth.ts';
import { db, transaction } from './db.ts';

const PORT = Number(process.env.PORT ?? 3000);
const STATIC_DIR = process.env.STATIC_DIR ?? './dist';
// On in production (behind the HTTPS reverse proxy), off for local http dev.
const SECURE_COOKIE = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production';
const COOKIE = 'session';

const app = new Hono<{ Variables: { user: User } }>();

app.use('/api/*', csrf());
app.use('/api/*', bodyLimit({ maxSize: 10 * 1024 * 1024 }));

app.post('/api/login', async (c) => {
  const body: { username?: unknown; password?: unknown } = await c.req.json().catch(() => ({}));
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username || !password) return c.json({ error: 'Username and password are required.' }, 400);
  if (isLockedOut(username)) return c.json({ error: 'Too many failed attempts. Try again in 15 minutes.' }, 429);

  const user = await checkCredentials(username, password);
  if (!user) {
    recordFailure(username);
    return c.json({ error: 'Invalid username or password.' }, 401);
  }

  clearFailures(username);
  setCookie(c, COOKIE, createSession(user.id), {
    httpOnly: true,
    secure: SECURE_COOKIE,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
  return c.json(user);
});

app.post('/api/logout', (c) => {
  const token = getCookie(c, COOKIE);
  if (token) deleteSession(token);
  deleteCookie(c, COOKIE, { path: '/' });
  return c.body(null, 204);
});

const requireUser = createMiddleware<{ Variables: { user: User } }>(async (c, next) => {
  const token = getCookie(c, COOKIE);
  const user = token ? getSessionUser(token) : null;
  if (!user) return c.json({ error: 'Not logged in.' }, 401);
  c.set('user', user);
  await next();
});

app.get('/api/health', (c) => c.json({ ok: true }));

app.get('/api/me', requireUser, (c) => c.json(c.get('user')));

app.get('/api/data', requireUser, (c) => {
  const rows = db.prepare('SELECT key, value FROM kv WHERE user_id = ?').all(c.get('user').id) as {
    key: string;
    value: string;
  }[];
  return c.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
});

// One request carries every write the frontend batched since its last flush,
// applied atomically so a restore-from-backup can't land half-way.
app.put('/api/data', requireUser, async (c) => {
  const body = await c.req.json<{ set?: unknown; remove?: unknown }>().catch(() => null);
  const set = body?.set ?? {};
  const remove = body?.remove ?? [];
  if (
    typeof set !== 'object' || set === null || Array.isArray(set) ||
    !Object.values(set).every((v) => typeof v === 'string') ||
    !Array.isArray(remove) || !remove.every((k) => typeof k === 'string')
  ) {
    return c.json({ error: 'Expected { set: Record<string, string>, remove: string[] }.' }, 400);
  }

  const userId = c.get('user').id;
  const upsert = db.prepare(
    'INSERT INTO kv (user_id, key, value) VALUES (?, ?, ?) ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value',
  );
  const del = db.prepare('DELETE FROM kv WHERE user_id = ? AND key = ?');
  transaction(() => {
    for (const key of remove as string[]) del.run(userId, key);
    for (const [key, value] of Object.entries(set as Record<string, string>)) upsert.run(userId, key, value);
  });
  return c.body(null, 204);
});

app.all('/api/*', (c) => c.json({ error: 'Not found.' }, 404));

// The frontend is a client-routed SPA: serve real files when they exist,
// otherwise index.html so deep links like /application/foo still load.
app.use('/*', serveStatic({ root: STATIC_DIR }));
app.get('/*', serveStatic({ root: STATIC_DIR, path: 'index.html' }));

deleteExpiredSessions();
setInterval(deleteExpiredSessions, 60 * 60 * 1000).unref();

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
});
