import type { ApplicationConfig } from '../types';
import { storage } from './storage';

const KEY = 'local-apps';

export function getLocalApplications(): ApplicationConfig[] {
  try {
    const raw = storage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ApplicationConfig[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalApplication(app: ApplicationConfig): void {
  const rest = getLocalApplications().filter((a) => a.id !== app.id);
  storage.setItem(KEY, JSON.stringify([...rest, app]));
}

export function deleteLocalApplication(id: string): void {
  const rest = getLocalApplications().filter((a) => a.id !== id);
  storage.setItem(KEY, JSON.stringify(rest));
}

export function isLocalApplication(id: string): boolean {
  return getLocalApplications().some((a) => a.id === id);
}
