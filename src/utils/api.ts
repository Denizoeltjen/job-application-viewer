import { flush } from './storage';

export interface SessionUser {
  id: number;
  username: string;
}

export async function fetchCurrentUser(): Promise<SessionUser | null> {
  const res = await fetch('/api/me');
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`Server unreachable (HTTP ${res.status}).`);
  return res.json();
}

export async function login(username: string, password: string): Promise<SessionUser> {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Login failed (HTTP ${res.status}).`);
  return body;
}

export async function logout(): Promise<void> {
  await fetch('/api/logout', { method: 'POST' });
}

export async function fetchUserData(): Promise<Record<string, string>> {
  const res = await fetch('/api/data');
  if (!res.ok) throw new Error(`Loading data failed (HTTP ${res.status}).`);
  return res.json();
}

/** Saves any pending edits, ends the session, and returns to the login screen. */
export async function logoutAndReload(): Promise<void> {
  await flush().catch(() => {});
  await logout();
  window.location.reload();
}
