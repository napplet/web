/** State transitions for the NAP-NAVIGATION reference runtime. */
import type { NavigationEntry, NavigationLocation, NavigationReport, NavigationView } from '@napplet/core';
import { equalJson } from '../validators/navigation.js';

export interface PendingVisit { deliveryId: string; entryId: string; deadline: number; timer: ReturnType<typeof setTimeout> }
export interface NavigationState {
  view: NavigationView;
  highestRevision: number;
  accepted?: NavigationReport;
  pending?: PendingVisit;
}
export function emptyView(): NavigationView {
  return { entries: [], index: null, reportRevision: null, status: 'unreported' };
}
export function settle(state: NavigationState): void {
  if (state.pending) clearTimeout(state.pending.timer);
  state.pending = undefined;
}
export function uncertain(state: NavigationState): void {
  settle(state);
  state.view.status = state.accepted ? 'uncertain' : 'unreported';
}
export function sameInvocation(left: NavigationLocation, right: NavigationLocation): boolean {
  const invocation = ({ convention, ...rest }: NavigationLocation) => ({ convention, ...('payload' in rest ? { payload: rest.payload } : {}) });
  return equalJson(invocation(left), invocation(right));
}

/** Compute an atomic candidate; callers apply capacity policy before committing it. */
export function nextView(state: NavigationState, report: NavigationReport, newId: () => string): NavigationView {
  const entries: NavigationEntry[] = structuredClone(state.view.entries);
  let index = state.view.index;
  const target = state.pending && report.deliveryId === state.pending.deliveryId
    ? entries.findIndex((entry) => entry.id === state.pending!.entryId) : -1;
  if (report.location === null) index = null;
  else if (target >= 0 && sameInvocation(report.location, entries[target].location)) {
    index = target;
    entries[target].location = structuredClone(report.location);
  } else if (report.mode === 'replace' && index !== null) {
    entries[index].location = structuredClone(report.location);
  } else {
    if (index !== null) entries.splice(index + 1);
    entries.push({ id: newId(), location: structuredClone(report.location) });
    index = entries.length - 1;
  }
  return { entries, index, reportRevision: report.revision, status: 'current' };
}

/** Apply explicit shell retention while making removed current/pending visits visible. */
export function pruneView(state: NavigationState, keepIds: readonly string[]): NavigationView {
  const current = state.view.index === null ? undefined : state.view.entries[state.view.index].id;
  const entries = state.view.entries.filter((entry) => keepIds.includes(entry.id));
  const currentIndex = entries.findIndex((entry) => entry.id === current);
  if ((current && currentIndex < 0) || (state.pending && !keepIds.includes(state.pending.entryId))) uncertain(state);
  state.view.entries = entries;
  state.view.index = currentIndex < 0 ? null : currentIndex;
  return structuredClone(state.view);
}
