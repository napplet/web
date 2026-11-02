<script lang="ts">
  import { onMount } from 'svelte';
  import { probeCatalog, levelLabels, type ProbeLevel } from './lib/probes';
  import { type ProbeStatus } from './lib/probe-result';
  import {
    createRows,
    executeProbe,
    runAllOrder,
    countStatuses,
    countLevels,
    type ProbeRow,
  } from './lib/runner';
  import { COLUMNS, DEFAULT_VISIBLE_COLUMNS, normalizeVisibleColumns, type ColumnId } from './lib/columns';
  import { loadPreferences, savePreferences, resolvePreferenceStore } from './lib/preferences';

  let rows = $state<ProbeRow[]>(createRows(probeCatalog));
  let runningAll = $state(false);
  /** idle -> running -> done; `done` lets screenshot/e2e tooling wait for a settled table. */
  let runState = $state<'idle' | 'running' | 'done'>('idle');

  let visibleColumns = $state<ColumnId[]>([...DEFAULT_VISIBLE_COLUMNS]);
  let settingsOpen = $state(false);
  /** 'memory' until NAP-STORAGE is confirmed, then 'storage' (or 'error' when a write failed). */
  let persistence = $state<'memory' | 'storage' | 'error'>('memory');
  const preferenceStore = resolvePreferenceStore(window);

  const visible = $derived(new Set(visibleColumns));
  const isVisible = (id: ColumnId) => visible.has(id);

  const statusLabels: Record<ProbeStatus, string> = {
    pending: 'Pending',
    running: 'Running',
    pass: 'Pass',
    fail: 'Fail',
    warning: 'Warning',
    skipped: 'Skipped',
    info: 'Info',
  };

  function updateRow(id: string, patch: Partial<ProbeRow>): void {
    rows = rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
  }

  async function runProbe(id: string): Promise<void> {
    const row = rows.find((candidate) => candidate.id === id);
    if (!row || row.status === 'running') return;
    updateRow(id, {
      status: 'running',
      observed: 'Running',
      evidence: row.level === 'destructive'
        ? 'Sent. If this napplet is still here when the timer ends, the shell did not revoke.'
        : 'Probe in progress',
    });
    updateRow(id, await executeProbe(row));
  }

  async function runAll(): Promise<void> {
    if (runningAll) return;
    runningAll = true;
    runState = 'running';
    for (const id of runAllOrder(rows)) {
      await runProbe(id);
    }
    runningAll = false;
    runState = 'done';
  }

  async function setVisibleColumns(next: Iterable<ColumnId>): Promise<void> {
    visibleColumns = normalizeVisibleColumns(next);
    if (!preferenceStore) return;
    persistence = (await savePreferences(preferenceStore, { visibleColumns })) ? 'storage' : 'error';
  }

  function toggleColumn(id: ColumnId): void {
    void setVisibleColumns(visible.has(id) ? visibleColumns.filter((column) => column !== id) : [...visibleColumns, id]);
  }

  function resetColumns(): void {
    void setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
  }

  function showAllColumns(): void {
    void setVisibleColumns(COLUMNS.map((column) => column.id));
  }

  const counts = $derived(countStatuses(rows));
  const levelCounts = $derived(countLevels(rows));

  onMount(() => {
    void (async () => {
      if (preferenceStore) {
        const loaded = await loadPreferences(preferenceStore);
        visibleColumns = loaded.visibleColumns;
        persistence = 'storage';
      }
    })();
    void runAll();
  });
</script>

<main data-testid="security-lab" data-run-state={runState}>
  <header class="mast">
    <div class="actions">
      <div class="levels" aria-label="Probe levels">
        {#each Object.entries(levelCounts) as [level, count]}
          <span class="level-chip level-{level}"><b>{count}</b>{levelLabels[level as ProbeLevel]}</span>
        {/each}
      </div>
      <div class="buttons">
        <button
          class="settings-toggle"
          class:active={settingsOpen}
          onclick={() => (settingsOpen = !settingsOpen)}
          aria-expanded={settingsOpen}
          aria-controls="column-settings"
          data-testid="toggle-settings"
        >columns ({visibleColumns.length}/{COLUMNS.length})</button>
        <button onclick={runAll} disabled={runningAll} data-testid="run-all-probes">
          {runningAll ? 'running' : 'run all (non-destructive)'}
        </button>
      </div>
    </div>
  </header>

  {#if settingsOpen}
    <section class="settings" id="column-settings" aria-label="Column settings" data-testid="column-settings">
      <div class="settings-head">
        <span>Visible columns</span>
        <span class="persistence" data-testid="persistence-state">
          {#if persistence === 'storage'}saved via NAP-STORAGE{:else if persistence === 'error'}NAP-STORAGE write failed; kept for this session only{:else}not persisted: shell exposes no storage domain{/if}
        </span>
        <span class="settings-actions">
          <button onclick={resetColumns} data-testid="columns-reset">defaults</button>
          <button onclick={showAllColumns} data-testid="columns-all">all</button>
        </span>
      </div>
      <ul class="column-list">
        {#each COLUMNS as column (column.id)}
          <li>
            <label class:locked={column.locked}>
              <input
                type="checkbox"
                checked={isVisible(column.id)}
                disabled={column.locked}
                onchange={() => toggleColumn(column.id)}
                data-testid="column-toggle-{column.id}"
              />
              <span class="column-label">{column.label}</span>
              <span class="column-hint">{column.hint}{column.locked ? ' (always shown)' : ''}</span>
            </label>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <section class="summary" aria-label="Probe status summary" data-testid="summary">
    <span class="status-pass"><b data-testid="count-pass">{counts.pass}</b> pass</span>
    <span class="status-fail"><b data-testid="count-fail">{counts.fail}</b> fail</span>
    <span class="status-warning"><b data-testid="count-warning">{counts.warning}</b> warning</span>
    <span class="status-info"><b data-testid="count-info">{counts.info}</b> info</span>
    <span class="status-skipped"><b data-testid="count-skipped">{counts.skipped}</b> skipped</span>
    <span class="status-pending"><b data-testid="count-pending">{counts.pending + counts.running}</b> pending/running</span>
  </section>

  <p class="legend">
    <b>pass</b> boundary held · <b>fail</b> a NIP-5D MUST was violated · <b>warning</b> a SHOULD was not followed or the runtime path could not be confirmed · <b>info</b> observation only (documented non-guarantee or allowed capability) · <b>destructive</b> rows are never part of "run all": their run button fires immediately and a compliant shell will revoke and remove this napplet.
  </p>

  <section class="table-shell" aria-label="Security boundary probe table">
    <table class:compact={visibleColumns.length <= 5}>
      <thead>
        <tr>
          {#each COLUMNS as column (column.id)}
            {#if isVisible(column.id)}
              <th class="col-{column.id}">{column.label}</th>
            {/if}
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.id)}
          <tr data-testid="probe-row" data-probe-id={row.id} data-status={row.status} data-level={row.level}>
            {#if isVisible('run')}
              <td class="col-run run-cell" data-col="run">
                <button
                  class="row-run"
                  class:destructive={row.level === 'destructive'}
                  onclick={() => runProbe(row.id)}
                  disabled={row.status === 'running' || (row.level === 'destructive' && runningAll)}
                  title={row.level === 'destructive' ? 'Runs now. A compliant shell revokes and removes this napplet.' : undefined}
                  data-testid="run-probe-{row.id}"
                >run</button>
              </td>
            {/if}
            {#if isVisible('status')}
              <td class="col-status status-cell" data-col="status">
                <span class="status status-{row.status}" aria-label={`Status: ${statusLabels[row.status]}`}>
                  <span class="status-dot" aria-hidden="true"></span>
                  <span>{statusLabels[row.status]}</span>
                </span>
              </td>
            {/if}
            {#if isVisible('probe')}<td class="col-probe" data-col="probe">{row.probe}</td>{/if}
            {#if isVisible('observed')}<td class="col-observed" data-col="observed"><span class="value-chip value-observed">{row.observed}</span></td>{/if}
            {#if isVisible('evidence')}<td class="col-evidence" data-col="evidence">{row.evidence}</td>{/if}
            {#if isVisible('level')}<td class="col-level" data-col="level"><span class="level level-{row.level}">{levelLabels[row.level]}</span></td>{/if}
            {#if isVisible('category')}<td class="col-category" data-col="category"><span class="meta-chip">{row.category}</span></td>{/if}
            {#if isVisible('expected')}<td class="col-expected" data-col="expected">{row.expected}</td>{/if}
            {#if isVisible('spec')}<td class="col-spec spec" data-col="spec">{row.spec}</td>{/if}
            {#if isVisible('expectedResult')}<td class="col-expectedResult" data-col="expectedResult"><span class="value-chip value-expected">{row.expectedResult}</span></td>{/if}
            {#if isVisible('severity')}<td class="col-severity" data-col="severity"><span class="severity severity-{row.severity}">{row.severity}</span></td>{/if}
            {#if isVisible('ownerArea')}<td class="col-ownerArea" data-col="ownerArea">{row.ownerArea}</td>{/if}
            {#if isVisible('lastRun')}<td class="col-lastRun" data-col="lastRun">{row.lastRun}</td>{/if}
          </tr>
        {/each}
      </tbody>
    </table>
  </section>
</main>

<style>
  :global(:root) {
    /* Fallback palette; NAP-THEME overrides the three base variables at runtime. */
    --lab-bg: #0f1115;
    --lab-text: #e6e6e6;
    --lab-accent: #8ab4f8;
    --lab-font-body: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    --lab-danger: #ff6b6b;
    --lab-warning: #f5b74a;
    --lab-success: #35d07f;
    --lab-info: #9aa5b1;
  }

  :global(body) {
    margin: 0;
    background: var(--lab-bg);
    color: var(--lab-text);
    font: 11px/1.45 var(--lab-font-body);
  }

  main {
    --lab-bg-elevated: color-mix(in srgb, var(--lab-bg) 94%, var(--lab-text));
    --lab-text-muted: color-mix(in srgb, var(--lab-text) 62%, var(--lab-bg));
    --lab-border: color-mix(in srgb, var(--lab-text) 18%, var(--lab-bg));
    --lab-border-accent: color-mix(in srgb, var(--lab-accent) 55%, var(--lab-bg));
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 100vh;
    padding: 12px;
  }

  .mast {
    align-items: end;
    border-bottom: 1px solid var(--lab-border);
    display: flex;
    gap: 12px;
    justify-content: space-between;
    padding-bottom: 6px;
  }

  .actions {
    align-items: center;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: space-between;
    width: 100%;
  }

  .levels,
  .summary {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: flex-end;
  }

  .levels span,
  .summary span {
    border: 1px solid var(--lab-border);
    color: var(--lab-text-muted);
    display: inline-flex;
    gap: 6px;
    padding: 3px 6px;
  }

  .levels b,
  .summary b {
    color: var(--lab-accent);
  }

  .legend {
    color: var(--lab-text-muted);
    margin: 0;
  }

  .legend b {
    color: var(--lab-text);
  }

  button {
    background: var(--lab-bg-elevated);
    border: 1px solid var(--lab-border-accent);
    color: var(--lab-accent);
    cursor: pointer;
    font: inherit;
    padding: 4px 8px;
  }

  button:disabled {
    border-color: var(--lab-border);
    color: var(--lab-text-muted);
    cursor: default;
  }

  button.destructive {
    border-color: color-mix(in srgb, var(--lab-danger) 55%, var(--lab-bg));
    color: var(--lab-danger);
  }

  .table-shell {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  table {
    border-collapse: collapse;
    font-size: 11px;
    min-width: 1280px;
    width: 100%;
  }

  table.compact {
    min-width: 0;
  }

  td.col-evidence,
  td.col-expected {
    max-width: 52ch;
    overflow-wrap: anywhere;
  }

  .buttons {
    display: flex;
    gap: 6px;
  }

  .settings-toggle.active {
    background: color-mix(in srgb, var(--lab-accent) 18%, var(--lab-bg));
  }

  .settings {
    border: 1px solid var(--lab-border);
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px 10px;
  }

  .settings-head {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: space-between;
  }

  .settings-head > span:first-child {
    color: var(--lab-text-muted);
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .persistence {
    color: var(--lab-text-muted);
  }

  .settings-actions {
    display: flex;
    gap: 6px;
  }

  .column-list {
    display: grid;
    gap: 4px 16px;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .column-list label {
    align-items: baseline;
    cursor: pointer;
    display: flex;
    gap: 6px;
  }

  .column-list label.locked {
    cursor: default;
  }

  .column-list input {
    accent-color: var(--lab-accent);
    margin: 0;
  }

  .column-label {
    color: var(--lab-text);
  }

  .column-hint {
    color: var(--lab-text-muted);
    font-size: 10px;
  }

  th,
  td {
    border-bottom: 1px solid var(--lab-border);
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
  }

  th {
    background: var(--lab-bg-elevated);
    color: var(--lab-text-muted);
    font-size: 10px;
    font-weight: 700;
    position: sticky;
    text-transform: uppercase;
    top: 0;
    z-index: 1;
  }

  td {
    color: var(--lab-text);
  }

  td.col-status,
  td.col-level,
  td.col-category,
  td.col-spec,
  td.col-expectedResult,
  td.col-observed,
  td.col-severity,
  td.col-ownerArea,
  td.col-lastRun {
    font-size: 10px;
  }

  td.spec {
    color: var(--lab-text-muted);
  }

  tr:hover td {
    background: var(--lab-bg-elevated);
  }

  .status-cell {
    min-width: 96px;
  }

  .run-cell {
    background: var(--lab-bg);
    left: 0;
    position: sticky;
    white-space: nowrap;
    z-index: 1;
  }

  th:first-child {
    left: 0;
    position: sticky;
    z-index: 2;
  }

  .level,
  .status,
  .severity,
  .meta-chip,
  .value-chip {
    border: 1px solid var(--lab-border);
    display: inline-flex;
    max-width: 100%;
    padding: 1px 6px;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .status {
    align-items: center;
    border-radius: 2px;
    font-weight: 700;
    gap: 5px;
    min-width: 74px;
  }

  .status-dot {
    border-radius: 999px;
    display: inline-block;
    flex: 0 0 auto;
    height: 7px;
    width: 7px;
  }

  .meta-chip {
    color: var(--lab-text-muted);
  }

  .value-chip {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .value-expected {
    background: color-mix(in srgb, var(--lab-accent) 8%, transparent);
    border-color: color-mix(in srgb, var(--lab-accent) 28%, var(--lab-border));
    color: color-mix(in srgb, var(--lab-accent) 72%, var(--lab-text));
  }

  .value-observed {
    background: color-mix(in srgb, var(--lab-text) 6%, transparent);
    border-color: color-mix(in srgb, var(--lab-text) 18%, var(--lab-border));
    color: var(--lab-text);
  }

  .row-run {
    min-width: 42px;
    padding: 2px 6px;
  }

  .level-baseline,
  .severity-info {
    color: var(--lab-accent);
  }

  .level-runtime-mediated {
    color: var(--lab-text);
  }

  .level-safe-adversarial {
    color: var(--lab-warning);
  }

  .level-destructive,
  .severity-critical {
    color: var(--lab-danger);
  }

  .severity-high {
    color: var(--lab-warning);
  }

  .severity-medium,
  .severity-low {
    color: var(--lab-text-muted);
  }

  .status-pass {
    background: color-mix(in srgb, var(--lab-success) 14%, transparent);
    border-color: color-mix(in srgb, var(--lab-success) 52%, var(--lab-border));
    color: color-mix(in srgb, var(--lab-success) 70%, var(--lab-text));
  }

  .status-pass .status-dot {
    background: var(--lab-success);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--lab-success) 20%, transparent);
  }

  .status-fail {
    background: color-mix(in srgb, var(--lab-danger) 14%, transparent);
    border-color: color-mix(in srgb, var(--lab-danger) 55%, var(--lab-border));
    color: var(--lab-danger);
  }

  .status-fail .status-dot {
    background: var(--lab-danger);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--lab-danger) 20%, transparent);
  }

  .status-warning {
    background: color-mix(in srgb, var(--lab-warning) 14%, transparent);
    border-color: color-mix(in srgb, var(--lab-warning) 55%, var(--lab-border));
    color: var(--lab-warning);
  }

  .status-warning .status-dot {
    background: var(--lab-warning);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--lab-warning) 20%, transparent);
  }

  .status-info {
    background: color-mix(in srgb, var(--lab-info) 14%, transparent);
    border-color: color-mix(in srgb, var(--lab-info) 55%, var(--lab-border));
    color: var(--lab-info);
  }

  .status-info .status-dot {
    background: var(--lab-info);
  }

  .status-running,
  .status-pending,
  .status-skipped {
    background: color-mix(in srgb, var(--lab-text-muted) 8%, transparent);
    border-color: var(--lab-border);
    color: var(--lab-text-muted);
  }

  .status-running .status-dot,
  .status-pending .status-dot,
  .status-skipped .status-dot {
    background: var(--lab-text-muted);
  }

  @media (max-width: 720px) {
    .mast {
      align-items: stretch;
      flex-direction: column;
    }

    .actions {
      align-items: flex-start;
    }

    .levels,
    .summary {
      justify-content: flex-start;
    }
  }
</style>
