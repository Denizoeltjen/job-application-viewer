import type { AppLanguage, ApplicationConfig, BaseProfile, Profile } from '../types';
import { storage } from './storage';
import { getProfile } from '../data/profiles';
import { applications } from '../data/applications';
import { getLocalApplications } from './localApplications';

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

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function uniqueSlug(name: string, existingIds: Set<string>, fallback: string): string {
  const base = slugify(name) || fallback;
  if (!existingIds.has(base)) return base;
  let i = 2;
  while (existingIds.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

// A project's `id` is a free-text field (it doubles as a URL slug), so
// nothing stops two projects from ending up with the same id — most often
// both blank, left over from "+ Add project" defaulting to `id: ''`. Several
// features (FeaturedProjectsPicker, CV rendering) key off `id` assuming it's
// unique, so a collision makes one project swallow the other. Repairing on
// every read/write means already-broken profiles self-heal without the user
// having to notice or edit the ID field by hand.
function ensureUniqueProjectIds(profile: Profile): Profile {
  const seen = new Set<string>();
  let changed = false;
  const projects = profile.projects.map((proj) => {
    let { id } = proj;
    if (!id || seen.has(id)) {
      id = uniqueSlug(proj.name, seen, 'project');
      changed = true;
    }
    seen.add(id);
    return id === proj.id ? proj : { ...proj, id };
  });
  return changed ? { ...profile, projects } : profile;
}

function repairBaseProfile(bp: BaseProfile): BaseProfile {
  const profile = ensureUniqueProjectIds(bp.profile);
  return profile === bp.profile ? bp : { ...bp, profile };
}

export function getBaseProfiles(): BaseProfile[] {
  const list = readList() ?? seedFromLegacyProfiles();
  const repaired = list.map(repairBaseProfile);
  if (repaired.some((bp, i) => bp !== list[i])) writeList(repaired);
  return repaired;
}

export function getBaseProfile(id: string): BaseProfile | undefined {
  return getBaseProfiles().find((p) => p.id === id);
}

export function saveBaseProfile(baseProfile: BaseProfile): void {
  const rest = getBaseProfiles().filter((p) => p.id !== baseProfile.id);
  writeList([...rest, repairBaseProfile(baseProfile)]);
}

export function deleteBaseProfile(id: string): void {
  writeList(getBaseProfiles().filter((p) => p.id !== id));
}

export function uniqueBaseProfileId(name: string): string {
  return uniqueSlug(name, new Set(getBaseProfiles().map((p) => p.id)), 'profile');
}

// Used when adding a new project in the profile editor, so it never starts
// with a blank id that could collide with another blank-id project.
export function uniqueProjectId(name: string, existingIds: string[]): string {
  return uniqueSlug(name, new Set(existingIds), 'project');
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
