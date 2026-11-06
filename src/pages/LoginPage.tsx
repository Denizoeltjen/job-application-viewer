import { useState } from 'react';
import type { FormEvent } from 'react';
import { login } from '../utils/api';
import type { SessionUser } from '../utils/api';
import { nafInput, nafLabel, nafSection } from '../styles/formStyles';

export function LoginPage({ onLoggedIn }: { onLoggedIn: (user: SessionUser) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onLoggedIn(await login(username, password));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[color:var(--bg)] flex items-center justify-center px-4">
      <form
        className="w-full max-w-[340px] flex flex-col gap-5 bg-[color:var(--ink)] p-7 rounded-md"
        onSubmit={submit}
      >
        <div className="[font-family:var(--font-mono)] text-[15px]">
          <span className="text-[color:var(--ink-3)]">~/</span>
          <span className="text-[color:var(--accent)]">login</span>
          <span className="text-[color:var(--ink-3)] animate-pulse"> _</span>
        </div>
        <label className={nafSection}>
          <span className={nafLabel}>Username</span>
          <input
            className={nafInput}
            autoComplete="username"
            autoFocus
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className={nafSection}>
          <span className={nafLabel}>Password</span>
          <input
            className={nafInput}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="text-[12px] text-[color:var(--status-rejected)]">{error}</p>}
        <button
          className="[font-family:var(--font-mono)] text-[12px] bg-[color:var(--accent)] text-[color:var(--ink)] font-semibold border-none rounded px-4 py-2 cursor-pointer transition-[filter] duration-150 hover:brightness-110 disabled:opacity-60 disabled:cursor-default"
          type="submit"
          disabled={busy}
        >
          {busy ? 'logging in…' : 'log in'}
        </button>
      </form>
    </div>
  );
}
