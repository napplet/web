import { describe, expect, it } from 'vitest';
import { COLUMNS, COLUMN_IDS, DEFAULT_VISIBLE_COLUMNS, LOCKED_COLUMNS, isColumnId, normalizeVisibleColumns } from './columns';

describe('column catalogue', () => {
  it('has unique ids and a developer-minimal default set', () => {
    expect(new Set(COLUMN_IDS).size).toBe(COLUMN_IDS.length);
    expect(DEFAULT_VISIBLE_COLUMNS).toEqual(['run', 'status', 'probe', 'observed', 'evidence']);
    expect(LOCKED_COLUMNS).toEqual(['run', 'status']);
    expect(COLUMNS.every((column) => column.hint.length > 0)).toBe(true);
  });

  it('isColumnId rejects unknown values', () => {
    expect(isColumnId('probe')).toBe(true);
    expect(isColumnId('nope')).toBe(false);
    expect(isColumnId(42)).toBe(false);
  });

  it('normalizeVisibleColumns keeps locked columns, drops junk, and preserves catalogue order', () => {
    expect(normalizeVisibleColumns(['lastRun', 'nope', 'probe', 7])).toEqual(['run', 'status', 'probe', 'lastRun']);
    expect(normalizeVisibleColumns([])).toEqual(['run', 'status']);
  });
});
