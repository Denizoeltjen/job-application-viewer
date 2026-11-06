import { useEffect, useState } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { ApplicationPage } from './pages/ApplicationPage';
import { NewApplicationPage } from './pages/NewApplicationPage';
import { EditApplicationPage } from './pages/EditApplicationPage';
import { BaseProfilesPage } from './pages/BaseProfilesPage';
import { BaseProfileEditPage } from './pages/BaseProfileEditPage';
import { LoginPage } from './pages/LoginPage';
import { fetchCurrentUser, fetchUserData } from './utils/api';
import { hasPendingWrites, hydrate, onSyncStatus } from './utils/storage';

const router = createBrowserRouter([
  { path: '/', element: <DashboardPage /> },
  { path: '/profiles', element: <BaseProfilesPage /> },
  { path: '/profiles/:id', element: <BaseProfileEditPage /> },
  { path: '/application/new', element: <NewApplicationPage /> },
  { path: '/application/:id/edit', element: <EditApplicationPage /> },
  { path: '/application/:id', element: <ApplicationPage /> },
]);

type AuthState = { kind: 'loading' } | { kind: 'anonymous' } | { kind: 'ready' } | { kind: 'error'; message: string };

const centered = 'min-h-screen bg-[color:var(--bg)] flex items-center justify-center [font-family:var(--font-mono)] text-[12px]';

// Every page reads storage synchronously while rendering, so the router only
// mounts once the user's data has been loaded into it.
export function App() {
  const [auth, setAuth] = useState<AuthState>({ kind: 'loading' });
  const [syncError, setSyncError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      hydrate(await fetchUserData());
      setAuth({ kind: 'ready' });
    } catch (e) {
      setAuth({ kind: 'error', message: e instanceof Error ? e.message : 'Loading data failed.' });
    }
  };

  useEffect(() => {
    fetchCurrentUser()
      .then((user) => (user ? loadData() : setAuth({ kind: 'anonymous' })))
      .catch((e) => setAuth({ kind: 'error', message: e instanceof Error ? e.message : 'Server unreachable.' }));
  }, []);

  useEffect(() => onSyncStatus(setSyncError), []);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (hasPendingWrites()) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  if (auth.kind === 'loading') return <div className={`${centered} text-[color:var(--ink-3)]`}>loading…</div>;
  if (auth.kind === 'error') return <div className={`${centered} text-[color:var(--status-rejected)]`}>{auth.message}</div>;
  if (auth.kind === 'anonymous') return <LoginPage onLoggedIn={() => void loadData()} />;

  return (
    <>
      <RouterProvider router={router} />
      {syncError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] [font-family:var(--font-mono)] text-[11px] bg-[color:var(--status-rejected)] text-[color:var(--ink)] font-semibold px-4 py-2 rounded shadow">
          {syncError} Retrying…
        </div>
      )}
    </>
  );
}
