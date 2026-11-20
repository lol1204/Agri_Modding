import type { UserProfile } from '@/domain/types';
import { dataStore } from '../store';

/** Profil teilweise ändern (wird mit dem Bestehenden zusammengeführt). */
export function updateProfile(patch: Partial<UserProfile>): void {
  const { hasProfile, profile } = dataStore.getState();
  const now = Date.now();
  // Beim allerersten Speichern das komplette Profil mit Standardwerten anlegen.
  const base = hasProfile ? {} : { ...profile, createdAt: now };
  dataStore.repos.profile.save({ ...base, ...patch, updatedAt: now });
}

/** Hilfetext als „gesehen“ markieren (wird dann nicht mehr automatisch gezeigt). */
export function markHintSeen(hintId: string): void {
  const { profile } = dataStore.getState();
  if (profile.seenHints.includes(hintId)) return;
  updateProfile({ seenHints: [...profile.seenHints, hintId] });
}

export function toggleFavorite(exerciseId: string): void {
  const { profile } = dataStore.getState();
  const favorites = profile.favorites.includes(exerciseId)
    ? profile.favorites.filter((id) => id !== exerciseId)
    : [...profile.favorites, exerciseId];
  updateProfile({ favorites });
}

export function toggleHiddenStat(statId: string): void {
  const { profile } = dataStore.getState();
  const hiddenStats = profile.hiddenStats.includes(statId)
    ? profile.hiddenStats.filter((id) => id !== statId)
    : [...profile.hiddenStats, statId];
  updateProfile({ hiddenStats });
}
