import type { AppLanguage, ApplicationConfig, BaseProfile, Profile } from '../types';
import { storage } from './storage';
import { getProfile } from '../data/profiles';
import { applications } from '../data/applications';
import { getLocalApplications } from './localApplications';
import { repairProjectIds, uniqueSlug } from './projectIds';

const KEY = 'base-profiles';

const LANGUAGE_LABELS: Record<AppLanguage, string> = { en: 'English', de: 'Deutsch' };

function readList(): BaseProfile[] | null {
  try {
    const raw = storage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BaseProfile[]) : null;
  } catch {
    return null;
  }
}

function writeList(list: BaseProfile[]): void {
  storage.setItem(KEY, JSON.stringify(list));
}

// First-run migration: fold the previous single-profile-per-language setup
// (static file + optional `profile-override-<lang>`, both already merged by
// `getProfile`) into one named base profile per language, so existing users
// keep their edits instead of losing them when this feature ships.
function seedFromLegacyProfiles(): BaseProfile[] {
  const seeded: BaseProfile[] = (['en', 'de'] as AppLanguage[]).map((language) => ({
    id: `default-${language}`,
    name: `${LANGUAGE_LABELS[language]} (default)`,
    language,
    profile: getProfile(language),
  }));
  writeList(seeded);
  return seeded;
}

export function getBaseProfiles(): BaseProfile[] {
  return readList() ?? seedFromLegacyProfiles();
}

export function getBaseProfile(id: string): BaseProfile | undefined {
  return getBaseProfiles().find((p) => p.id === id);
}

/**
 * Saves the base profile with blank or duplicate project ids repaired (the
 * editor's ID field and pasted JSON can both produce them) and returns what
 * was actually stored, so the caller can show the repaired ids.
 */
export function saveBaseProfile(baseProfile: BaseProfile): BaseProfile {
  const { profile, changed } = repairProjectIds(baseProfile.profile);
  const saved = changed ? { ...baseProfile, profile } : baseProfile;
  const rest = getBaseProfiles().filter((p) => p.id !== saved.id);
  writeList([...rest, saved]);
  return saved;
}

export function deleteBaseProfile(id: string): void {
  writeList(getBaseProfiles().filter((p) => p.id !== id));
}

export function uniqueBaseProfileId(name: string): string {
  return uniqueSlug(name, new Set(getBaseProfiles().map((p) => p.id)), 'profile');
}

export function blankProfile(language: AppLanguage): Profile {
  return {
    name: '',
    role: '',
    email: '',
    website: '',
    github: '',
    linkedin: '',
    city: '',
    summary: '',
    experience: [],
    projects: [],
    education: { degree: '', school: '', dates: '' },
    skillGroups: [],
    languages: [{ name: LANGUAGE_LABELS[language], level: '' }],
    interests: [],
  };
}

// Applications (static + local) that currently point at this base profile —
// used to warn before deleting one that's still in use.
export function applicationsUsingBaseProfile(id: string): ApplicationConfig[] {
  const all = [...applications, ...getLocalApplications()];
  return all.filter((a) => a.baseProfileId === id);
}

// Resolves the profile an application should render with: its selected base
// profile when set (falling back gracefully if that profile was since
// deleted), otherwise the legacy per-language profile — so applications
// created before this feature (or left on "language default") keep working.
export function resolveApplicationProfile(app: ApplicationConfig): Profile {
  if (app.baseProfileId) {
    const baseProfile = getBaseProfile(app.baseProfileId);
    if (baseProfile) return baseProfile.profile;
  }
  return getProfile(app.language);
}
