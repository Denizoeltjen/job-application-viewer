import type { Profile, AppLanguage } from '../types';
import { getProfileOverride } from '../utils/profileStorage';
import { repairProjectIds } from '../utils/projectIds';

// Real profile data is gitignored (personal info) — glob it so the app still
// builds and runs on a fresh clone, falling back to the committed example.
const modules = import.meta.glob<{ default: Profile }>('/private/profiles/*.json', { eager: true });

function loadProfile(lang: AppLanguage): Profile {
  const mod = modules[`/private/profiles/${lang}.json`] ?? modules[`/private/profiles/${lang}.example.json`];
  if (!mod) {
    throw new Error(
      `Missing profile data for "${lang}". Copy private/profiles/${lang}.example.json to ` +
      `private/profiles/${lang}.json and fill in your own details.`,
    );
  }
  return mod.default;
}

// The static files can't be rewritten from the app, so blank or duplicate
// project ids in them are repaired in memory on every load. The repair is
// deterministic, so the ids come out the same each time.
const repaired = {
  en: repairProjectIds(loadProfile('en')),
  de: repairProjectIds(loadProfile('de')),
};

const profiles: Record<AppLanguage, Profile> = {
  en: repaired.en.profile,
  de: repaired.de.profile,
};

/** The id the static profile's first blank-id project was given, for migrating applications that featured ''. */
export function getStaticProfileBlankProjectId(language: AppLanguage): string | null {
  return repaired[language].blankId;
}

export function getProfile(language?: AppLanguage): Profile {
  const lang = language ?? 'en';
  return getProfileOverride(lang) ?? profiles[lang];
}

export function getStaticProfile(language?: AppLanguage): Profile {
  return profiles[language ?? 'en'];
}
