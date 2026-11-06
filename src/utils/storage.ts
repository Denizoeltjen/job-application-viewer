// Drop-in replacement for the localStorage calls the app used to make: reads
// stay synchronous against an in-memory copy loaded once after login, and
// writes are batched into a single request to the server shortly after.

const data = new Map<string, string>();
const pendingSet = new Map<string, string>();
const pendingRemove = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<void> = Promise.resolve();

type SyncListener = (error: string | null) => void;
const listeners = new Set<SyncListener>();

export function onSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(error: string | null) {
  listeners.forEach((l) => l(error));
}

export function hydrate(entries: Record<string, string>): void {
  data.clear();
  Object.entries(entries).forEach(([k, v]) => data.set(k, v));
}

function scheduleFlush() {
  if (flushTimer === null) flushTimer = setTimeout(flushInBackground, 300);
}

async function send(set: Record<string, string>, remove: string[]): Promise<void> {
  const res = await fetch('/api/data', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ set, remove }),
  });
  if (res.status === 401) {
    // Session expired mid-edit: the login screen is the only way forward.
    window.location.reload();
    return;
  }
  if (!res.ok) throw new Error(`Saving failed (HTTP ${res.status}).`);
}

/** Sends every pending write now; resolves once the server has stored them, rejects if it couldn't. */
export function flush(): Promise<void> {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  const run = inFlight.then(async () => {
    if (!pendingSet.size && !pendingRemove.size) return;
    const set = Object.fromEntries(pendingSet);
    const remove = [...pendingRemove];
    pendingSet.clear();
    pendingRemove.clear();
    try {
      await send(set, remove);
      notify(null);
    } catch (e) {
      // Put the batch back (unless newer writes to the same key arrived
      // meanwhile) so the next flush retries it.
      Object.entries(set).forEach(([k, v]) => {
        if (!pendingSet.has(k) && !pendingRemove.has(k)) pendingSet.set(k, v);
      });
      remove.forEach((k) => {
        if (!pendingSet.has(k)) pendingRemove.add(k);
      });
      notify(e instanceof Error ? e.message : 'Saving failed.');
      setTimeout(flushInBackground, 5000);
      throw e;
    }
  });
  // Keep the queue itself unrejected so later flushes still run.
  inFlight = run.catch(() => {});
  return run;
}

// Failures already surface through onSyncStatus and are retried.
function flushInBackground() {
  flush().catch(() => {});
}

export function hasPendingWrites(): boolean {
  return pendingSet.size > 0 || pendingRemove.size > 0;
}

export const storage = {
  getItem(key: string): string | null {
    return data.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    data.set(key, value);
    pendingRemove.delete(key);
    pendingSet.set(key, value);
    scheduleFlush();
  },
  removeItem(key: string): void {
    data.delete(key);
    pendingSet.delete(key);
    pendingRemove.add(key);
    scheduleFlush();
  },
  keys(): string[] {
    return [...data.keys()];
  },
};
