// Developer preferences (visible columns), persisted through NAP-STORAGE when
// the shell exposes that domain. Browser storage is unavailable in a NIP-5D
// sandbox by design, so without the domain preferences live only in memory.

import { normalizeVisibleColumns, DEFAULT_VISIBLE_COLUMNS, type ColumnId } from './columns';

export const PREFERENCES_KEY = 'lab.preferences.v1';

export interface LabPreferences {
  visibleColumns: ColumnId[];
}

/** The subset of NAP-STORAGE the preferences need; tests pass a fake. */
export interface PreferenceStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export function defaultPreferences(): LabPreferences {
  return { visibleColumns: [...DEFAULT_VISIBLE_COLUMNS] };
}

export function serializePreferences(preferences: LabPreferences): string {
  return JSON.stringify({ visibleColumns: normalizeVisibleColumns(preferences.visibleColumns) });
}

/** Parse a stored value defensively: anything unusable yields the defaults. */
export function parsePreferences(raw: string | null | undefined): LabPreferences {
  if (typeof raw !== 'string' || raw === '') return defaultPreferences();
  try {
    const parsed = JSON.parse(raw) as { visibleColumns?: unknown };
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.visibleColumns)) return defaultPreferences();
    return { visibleColumns: normalizeVisibleColumns(parsed.visibleColumns) };
  } catch {
    return defaultPreferences();
  }
}

export async function loadPreferences(store: PreferenceStore | null | undefined): Promise<LabPreferences> {
  if (!store) return defaultPreferences();
  try {
    return parsePreferences(await store.getItem(PREFERENCES_KEY));
  } catch {
    return defaultPreferences();
  }
}

/** Returns true when the write reached the store. */
export async function savePreferences(store: PreferenceStore | null | undefined, preferences: LabPreferences): Promise<boolean> {
  if (!store) return false;
  try {
    await store.setItem(PREFERENCES_KEY, serializePreferences(preferences));
    return true;
  } catch {
    return false;
  }
}

/** Resolve the NAP-STORAGE domain if the shell injected it. */
export function resolvePreferenceStore(win: object = globalThis): PreferenceStore | null {
  const napplet = (win as { napplet?: { storage?: unknown } }).napplet;
  const storage = napplet?.storage as Partial<PreferenceStore> | undefined;
  return storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function'
    ? (storage as PreferenceStore)
    : null;
}
