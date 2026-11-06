import type { AppLanguage, Profile } from '../types';
import { storage } from './storage';

const key = (lang: AppLanguage) => `profile-override-${lang}`;

export function getProfileOverride(lang: AppLanguage): Profile | null {
  try {
    const raw = storage.getItem(key(lang));
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function setProfileOverride(lang: AppLanguage, profile: Profile): void {
  storage.setItem(key(lang), JSON.stringify(profile));
}

export function clearProfileOverride(lang: AppLanguage): void {
  storage.removeItem(key(lang));
}

export function hasProfileOverride(lang: AppLanguage): boolean {
  return storage.getItem(key(lang)) !== null;
}
