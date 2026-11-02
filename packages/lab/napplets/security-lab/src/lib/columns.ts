// Table column catalogue. Which columns exist, which a developer needs by
// default, and which can never be hidden (you must always be able to run a
// probe and read its status).

export type ColumnId =
  | 'run' | 'status' | 'level' | 'category' | 'probe' | 'expected' | 'spec'
  | 'expectedResult' | 'observed' | 'evidence' | 'severity' | 'ownerArea' | 'lastRun';

export interface ColumnDef {
  id: ColumnId;
  label: string;
  /** Shown when no preference has been saved. */
  defaultVisible: boolean;
  /** Cannot be hidden. */
  locked: boolean;
  /** One line for the settings panel. */
  hint: string;
}

export const COLUMNS: readonly ColumnDef[] = [
  { id: 'run', label: 'Run', defaultVisible: true, locked: true, hint: 'Run one probe' },
  { id: 'status', label: 'Status', defaultVisible: true, locked: true, hint: 'pass / fail / warning / info / skipped' },
  { id: 'probe', label: 'Probe', defaultVisible: true, locked: false, hint: 'What the probe does' },
  { id: 'observed', label: 'Observed', defaultVisible: true, locked: false, hint: 'Short outcome' },
  { id: 'evidence', label: 'Evidence / Error', defaultVisible: true, locked: false, hint: 'Why the probe decided what it did' },
  { id: 'level', label: 'Level', defaultVisible: false, locked: false, hint: 'Baseline, runtime mediated, safe adversarial, destructive' },
  { id: 'category', label: 'Category', defaultVisible: false, locked: false, hint: 'Sandbox, CSP, storage, network, namespace, ...' },
  { id: 'expected', label: 'Expected Boundary', defaultVisible: false, locked: false, hint: 'The boundary NIP-5D expects to hold' },
  { id: 'spec', label: 'Spec', defaultVisible: false, locked: false, hint: 'NIP-5D section the probe traces to' },
  { id: 'expectedResult', label: 'Expected', defaultVisible: false, locked: false, hint: 'denied / absent / allowed-via-runtime / revoked ...' },
  { id: 'severity', label: 'Severity', defaultVisible: false, locked: false, hint: 'Impact if the boundary fails' },
  { id: 'ownerArea', label: 'Owner', defaultVisible: false, locked: false, hint: 'Who owns the boundary: runtime, CSP, sandbox, SDK' },
  { id: 'lastRun', label: 'Last Run', defaultVisible: false, locked: false, hint: 'Wall-clock time and duration' },
];

export const COLUMN_IDS: readonly ColumnId[] = COLUMNS.map((column) => column.id);
export const LOCKED_COLUMNS: readonly ColumnId[] = COLUMNS.filter((column) => column.locked).map((column) => column.id);
export const DEFAULT_VISIBLE_COLUMNS: readonly ColumnId[] = COLUMNS.filter((column) => column.defaultVisible).map((column) => column.id);

export function isColumnId(value: unknown): value is ColumnId {
  return typeof value === 'string' && (COLUMN_IDS as readonly string[]).includes(value);
}

/** Normalise any list of ids into a valid visible set: known ids only, locked ones always present. */
export function normalizeVisibleColumns(ids: Iterable<unknown>): ColumnId[] {
  const chosen = new Set<ColumnId>(LOCKED_COLUMNS);
  for (const id of ids) if (isColumnId(id)) chosen.add(id);
  // Keep catalogue order so the table never reorders when a column is toggled.
  return COLUMN_IDS.filter((id) => chosen.has(id));
}
