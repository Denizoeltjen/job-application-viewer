import type { ApplicationConfig, ApplicationStatus, AppLanguage, BaseProfile, Profile } from '../types';
import { storage } from './storage';
import { getBaseProfiles } from './baseProfiles';

const LOCAL_APPS_KEY = 'local-apps';
const STATUS_PREFIX = 'status-';
const CONFIG_PREFIX = 'app-config-';
const PROFILE_PREFIX = 'profile-override-';
const BASE_PROFILES_KEY = 'base-profiles';

export interface DataBackup {
  version: 2;
  exportedAt: string;
  localApps: ApplicationConfig[];
  statuses: Record<string, ApplicationStatus>;
  configOverrides: Record<string, Omit<ApplicationConfig, 'status'>>;
  profileOverrides: Partial<Record<AppLanguage, Profile>>;
  // Absent in version-1 backups, which predate named base profiles — restoring
  // one of those leaves the current base profiles untouched.
  baseProfiles?: BaseProfile[];
}

function allKeys(): string[] {
  return storage.keys();
}

/** Gathers every application, status, date/notes override, base profile, and profile customization stored for the logged-in user. */
export function exportAllData(): DataBackup {
  let localApps: ApplicationConfig[] = [];
  const statuses: Record<string, ApplicationStatus> = {};
  const configOverrides: Record<string, Omit<ApplicationConfig, 'status'>> = {};
  const profileOverrides: Partial<Record<AppLanguage, Profile>> = {};

  for (const key of allKeys()) {
    const raw = storage.getItem(key);
    if (raw === null) continue;

    if (key === LOCAL_APPS_KEY) {
      try { localApps = JSON.parse(raw) as ApplicationConfig[]; } catch { /* skip corrupt entry */ }
    } else if (key.startsWith(STATUS_PREFIX)) {
      statuses[key.slice(STATUS_PREFIX.length)] = raw as ApplicationStatus;
    } else if (key.startsWith(CONFIG_PREFIX)) {
      try { configOverrides[key.slice(CONFIG_PREFIX.length)] = JSON.parse(raw); } catch { /* skip corrupt entry */ }
    } else if (key.startsWith(PROFILE_PREFIX)) {
      try { profileOverrides[key.slice(PROFILE_PREFIX.length) as AppLanguage] = JSON.parse(raw); } catch { /* skip corrupt entry */ }
    }
  }

  // Goes through getBaseProfiles so an account that never opened the profiles
  // page still exports the profiles it would show (seeded from the legacy ones).
  const baseProfiles = getBaseProfiles();

  return { version: 2, exportedAt: new Date().toISOString(), localApps, statuses, configOverrides, profileOverrides, baseProfiles };
}

/** Triggers a browser download of the backup as a .json file — works the same in Chrome and Firefox. */
export function downloadBackup(backup: DataBackup): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `job-applications-backup-${backup.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type ParseBackupResult =
  | { ok: true; backup: DataBackup }
  | { ok: false; error: string };

/** Parses and structurally validates a backup file's contents. */
export function parseBackup(raw: string): ParseBackupResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${(e as SyntaxError).message}` };
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, error: 'Expected a JSON object.' };
  }

  const p = parsed as Record<string, unknown>;
  if (!Array.isArray(p.localApps)) return { ok: false, error: 'Not a valid backup file — missing "localApps" array.' };
  if (typeof p.statuses !== 'object' || p.statuses === null) return { ok: false, error: 'Not a valid backup file — missing "statuses" object.' };
  if (typeof p.configOverrides !== 'object' || p.configOverrides === null) return { ok: false, error: 'Not a valid backup file — missing "configOverrides" object.' };
  if (typeof p.profileOverrides !== 'object' || p.profileOverrides === null) return { ok: false, error: 'Not a valid backup file — missing "profileOverrides" object.' };
  if (p.baseProfiles !== undefined && !Array.isArray(p.baseProfiles)) return { ok: false, error: 'Not a valid backup file — "baseProfiles" must be an array.' };

  return {
    ok: true,
    backup: {
      version: 2,
      exportedAt: typeof p.exportedAt === 'string' ? p.exportedAt : new Date().toISOString(),
      localApps: p.localApps as ApplicationConfig[],
      statuses: p.statuses as Record<string, ApplicationStatus>,
      configOverrides: p.configOverrides as Record<string, Omit<ApplicationConfig, 'status'>>,
      profileOverrides: p.profileOverrides as Partial<Record<AppLanguage, Profile>>,
      baseProfiles: p.baseProfiles as BaseProfile[] | undefined,
    },
  };
}

/** Replaces every locally-stored application/profile key with the given backup's contents. */
export function applyBackup(backup: DataBackup): void {
  const toRemove = allKeys().filter(
    (key) => key === LOCAL_APPS_KEY || key.startsWith(STATUS_PREFIX) || key.startsWith(CONFIG_PREFIX) || key.startsWith(PROFILE_PREFIX),
  );
  toRemove.forEach((key) => storage.removeItem(key));

  storage.setItem(LOCAL_APPS_KEY, JSON.stringify(backup.localApps));
  Object.entries(backup.statuses).forEach(([id, status]) => {
    storage.setItem(`${STATUS_PREFIX}${id}`, status);
  });
  Object.entries(backup.configOverrides).forEach(([id, config]) => {
    storage.setItem(`${CONFIG_PREFIX}${id}`, JSON.stringify(config));
  });
  Object.entries(backup.profileOverrides).forEach(([lang, profile]) => {
    storage.setItem(`${PROFILE_PREFIX}${lang}`, JSON.stringify(profile));
  });
  if (backup.baseProfiles) {
    storage.setItem(BASE_PROFILES_KEY, JSON.stringify(backup.baseProfiles));
  }
}
