import type { AppLanguage, ApplicationConfig, BaseProfile } from '../types';
import { storage } from './storage';
import { repairProjectIds } from './projectIds';
import { getProfileOverride, setProfileOverride } from './profileStorage';
import { getStaticProfileBlankProjectId } from '../data/profiles';

// Runs once per page load, right after the user's data is loaded. Repairs
// blank or duplicate project ids in every stored profile and moves
// applications that featured the blank id ('') over to the id that blank
// project now has, so they keep showing the same project on their CV.
//
// Doing this up front, instead of whenever a profile is read, keeps reads
// free of writes and lets the applications be fixed in the same pass as the
// profiles they point at.

type StoredConfig = Omit<ApplicationConfig, 'status'>;

const BASE_PROFILES_KEY = 'base-profiles';
const LOCAL_APPS_KEY = 'local-apps';
const CONFIG_PREFIX = 'app-config-';
const LANGUAGES: AppLanguage[] = ['en', 'de'];

function readJson<T>(key: string): T | null {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function migrateProjectIds(): void {
  // Base profile id → new id of its first blank project.
  const baseBlankIds = new Map<string, string>();
  const baseProfiles = readJson<BaseProfile[]>(BASE_PROFILES_KEY);
  if (baseProfiles) {
    let changed = false;
    const repaired = baseProfiles.map((bp) => {
      const result = repairProjectIds(bp.profile);
      if (!result.changed) return bp;
      changed = true;
      if (result.blankId) baseBlankIds.set(bp.id, result.blankId);
      return { ...bp, profile: result.profile };
    });
    if (changed) storage.setItem(BASE_PROFILES_KEY, JSON.stringify(repaired));
  }

  // Language default profiles: a stored override is repaired and saved; the
  // static file can't be rewritten, so data/profiles repairs it on load and
  // reports the id its first blank project got.
  const languageBlankIds = new Map<AppLanguage, string>();
  for (const lang of LANGUAGES) {
    const override = getProfileOverride(lang);
    if (override) {
      const result = repairProjectIds(override);
      if (result.changed) setProfileOverride(lang, result.profile);
      if (result.blankId) languageBlankIds.set(lang, result.blankId);
    } else {
      const blankId = getStaticProfileBlankProjectId(lang);
      if (blankId) languageBlankIds.set(lang, blankId);
    }
  }

  if (baseBlankIds.size === 0 && languageBlankIds.size === 0) return;

  const existingBaseIds = new Set((baseProfiles ?? []).map((bp) => bp.id));
  // Same rule as resolveApplicationProfile: the selected base profile if it
  // still exists, otherwise the language default.
  const blankIdFor = (config: StoredConfig): string | undefined =>
    config.baseProfileId && existingBaseIds.has(config.baseProfileId)
      ? baseBlankIds.get(config.baseProfileId)
      : languageBlankIds.get(config.language ?? 'en');

  const fixConfig = <T extends StoredConfig>(config: T): T => {
    const ids = config.featuredProjectIds;
    const blankId = blankIdFor(config);
    if (!ids?.includes('') || !blankId) return config;
    const next = [...new Set(ids.map((id) => (id === '' ? blankId : id)))];
    return { ...config, featuredProjectIds: next };
  };

  const localApps = readJson<ApplicationConfig[]>(LOCAL_APPS_KEY);
  if (localApps) {
    const fixed = localApps.map(fixConfig);
    if (fixed.some((app, i) => app !== localApps[i])) storage.setItem(LOCAL_APPS_KEY, JSON.stringify(fixed));
  }

  for (const key of storage.keys().filter((k) => k.startsWith(CONFIG_PREFIX))) {
    const config = readJson<StoredConfig>(key);
    if (!config) continue;
    const fixed = fixConfig(config);
    if (fixed !== config) storage.setItem(key, JSON.stringify(fixed));
  }
}
