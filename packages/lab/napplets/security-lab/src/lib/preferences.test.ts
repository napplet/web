import { describe, expect, it } from 'vitest';
import {
  PREFERENCES_KEY,
  defaultPreferences,
  parsePreferences,
  serializePreferences,
  loadPreferences,
  savePreferences,
  resolvePreferenceStore,
  type PreferenceStore,
} from './preferences';

function memoryStore(initial: Record<string, string> = {}): PreferenceStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    async getItem(key) { return key in data ? data[key] : null; },
    async setItem(key, value) { data[key] = value; },
  };
}

describe('parsePreferences', () => {
  it('falls back to defaults for missing, empty, invalid JSON, or wrong shape', () => {
    for (const raw of [null, undefined, '', '{', '[]', '{"visibleColumns":"probe"}', '42']) {
      expect(parsePreferences(raw), String(raw)).toEqual(defaultPreferences());
    }
  });

  it('filters unknown ids and re-adds locked columns', () => {
    expect(parsePreferences('{"visibleColumns":["spec","bogus"]}')).toEqual({ visibleColumns: ['run', 'status', 'spec'] });
  });

  it('round-trips through serializePreferences', () => {
    const prefs = { visibleColumns: ['run', 'status', 'probe', 'severity'] as const };
    expect(parsePreferences(serializePreferences({ visibleColumns: [...prefs.visibleColumns] }))).toEqual({ visibleColumns: [...prefs.visibleColumns] });
  });
});

describe('load/save through a NAP-STORAGE-like store', () => {
  it('loads defaults without a store and saves nothing', async () => {
    expect(await loadPreferences(null)).toEqual(defaultPreferences());
    expect(await savePreferences(null, defaultPreferences())).toBe(false);
  });

  it('persists and reloads under the versioned key', async () => {
    const store = memoryStore();
    expect(await savePreferences(store, { visibleColumns: ['run', 'status', 'lastRun'] })).toBe(true);
    expect(Object.keys(store.data)).toEqual([PREFERENCES_KEY]);
    expect(await loadPreferences(store)).toEqual({ visibleColumns: ['run', 'status', 'lastRun'] });
  });

  it('survives a store that throws', async () => {
    const broken: PreferenceStore = {
      async getItem() { throw new Error('storage.get.error'); },
      async setItem() { throw new Error('storage.set.error'); },
    };
    expect(await loadPreferences(broken)).toEqual(defaultPreferences());
    expect(await savePreferences(broken, defaultPreferences())).toBe(false);
  });
});

describe('resolvePreferenceStore', () => {
  it('returns the injected storage domain only when it has the needed methods', () => {
    expect(resolvePreferenceStore({})).toBeNull();
    expect(resolvePreferenceStore({ napplet: {} })).toBeNull();
    expect(resolvePreferenceStore({ napplet: { storage: { getItem() {} } } })).toBeNull();
    const storage = { async getItem() { return null; }, async setItem() {} };
    expect(resolvePreferenceStore({ napplet: { storage } })).toBe(storage);
  });
});
