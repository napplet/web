/** Runtime-owned reference history; shell controls are not napplet wire operations. */
import type { IntentRequest, NavigationError, NavigationResult, NavigationView } from '@napplet/core';
import { equalJson, isNavigationReport, isRecord, navigationReportError, usableRevision } from '../validators/navigation.js';
import type { EndpointRegistry } from './reference-endpoints.js';
import type { IntentHandlers } from './reference-intents.js';
import { emptyView, nextView, pruneView, settle, uncertain, type NavigationState } from './navigation-state.js';

/** Reference retention and traversal policy; these defaults are not protocol limits. */
export interface ReferenceNavigationOptions {
  maxEntries?: number;
  maxLocationBytes?: number;
  timeoutMs?: number;
  canReport?: (endpointId: string) => boolean;
  canRevisit?: (endpointId: string) => boolean;
}

export function createReferenceNavigation(endpoints: EndpointRegistry, intents: IntentHandlers, now: () => number, options: ReferenceNavigationOptions = {}) {
  const states = new Map<string, NavigationState>();
  let visitSequence = 0;
  const maxEntries = options.maxEntries ?? 100;
  const maxBytes = options.maxLocationBytes ?? 65_536;
  const timeoutMs = options.timeoutMs ?? 30_000;
  if (!Number.isSafeInteger(maxEntries) || maxEntries < 1 || !Number.isFinite(maxBytes) || maxBytes < 1 || !Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Invalid reference navigation policy');
  const stateFor = (id: string): NavigationState => {
    let state = states.get(id);
    if (!state) { state = { view: emptyView(), highestRevision: 0 }; states.set(id, state); }
    if (state.pending && state.pending.deadline <= now()) uncertain(state);
    return state;
  };
  const result = (state: NavigationState, error?: NavigationError): NavigationResult => error
    ? { ok: false, view: structuredClone(state.view), error } : { ok: true, view: structuredClone(state.view) };
  const reject = (state: NavigationState, code: NavigationError['code'], message: string, invalidate = true): NavigationResult => {
    if (invalidate) uncertain(state);
    return result(state, { code, message });
  };
  function report(id: string, value: unknown): NavigationResult {
    const state = stateFor(id);
    const revision = isRecord(value) && usableRevision(value.revision) ? value.revision : undefined;
    if (revision === state.accepted?.revision) {
      if (isNavigationReport(value) && equalJson(value, state.accepted)) return result(state);
      return reject(state, 'invalid', 'changed accepted revision');
    }
    if (revision !== undefined && revision <= state.highestRevision) return reject(state, 'stale', 'report revision is not newer', false);
    if (revision !== undefined) state.highestRevision = revision;
    if (!isNavigationReport(value)) return reject(state, 'invalid', navigationReportError(value)!);
    const bound = endpoints.get(id);
    if (!bound || !endpoints.hasDomain(id, 'navigation') || !endpoints.hasDomain(id, 'intent') || options.canReport?.(id) === false) return reject(state, 'denied', 'navigation unavailable or denied');
    if (value.deliveryId && !bound.deliveries.has(value.deliveryId)) return reject(state, 'invalid', 'unknown delivery identifier');
    if (value.location) {
      const location = value.location;
      const names = Object.keys(location.payload ?? {});
      if (!bound.contracts.some((contract) => contract.convention === location.convention && names.every((key) => contract.params.includes(key)))) return reject(state, 'unsupported', 'location is not an advertised invocation');
      if (new TextEncoder().encode(JSON.stringify(location)).byteLength > maxBytes) return reject(state, 'limit', 'location exceeds reference retention limit');
    }
    const view = nextView(state, value, () => `visit-${++visitSequence}`);
    if (view.entries.length > maxEntries) return reject(state, 'limit', 'history capacity exceeded');
    settle(state);
    state.accepted = structuredClone(value);
    state.view = view;
    return result(state);
  }
  function revisit(id: string, entryId: string): NavigationResult {
    const state = stateFor(id);
    if (!endpoints.hasDomain(id, 'navigation') || !endpoints.hasDomain(id, 'intent') || options.canRevisit?.(id) === false) return reject(state, 'denied', 'history revisit unavailable or denied', false);
    if (state.view.status !== 'current') return reject(state, 'invalid', 'history is not current', false);
    const index = state.view.entries.findIndex((entry) => entry.id === entryId);
    if (index < 0) return reject(state, 'invalid', 'unknown retained visit', false);
    if (index === state.view.index) return result(state);
    const location = state.view.entries[index].location;
    const match = /^napplet:([^/?#]+)\/([^/?#]+)$/.exec(location.convention)!;
    const request: IntentRequest = { archetype: match[1], action: match[2], convention: location.convention, ...('payload' in location ? { payload: location.payload } : {}) };
    const delivery = intents.deliver(id, request);
    if (!delivery) return reject(state, 'denied', 'target cannot receive the intent', false);
    state.view.status = 'pending';
    const timer = setTimeout(() => { if (state.pending?.deliveryId === delivery.id) uncertain(state); }, timeoutMs);
    state.pending = { deliveryId: delivery.id, entryId, deadline: now() + timeoutMs, timer };
    intents.emit(id, delivery);
    return result(state);
  }
  return {
    report, revisit,
    get(id: string): NavigationResult {
      const state = stateFor(id);
      return endpoints.hasDomain(id, 'navigation') && endpoints.hasDomain(id, 'intent')
        ? result(state) : reject(state, 'denied', 'navigation unavailable', false);
    },
    view(id: string): NavigationView { return structuredClone(stateFor(id).view); },
    prune(id: string, keepIds: readonly string[]): NavigationView { return pruneView(stateFor(id), keepIds); },
    deliveryFailed(id: string, deliveryId: string, definite: boolean): void {
      const state = states.get(id);
      if (!state || state.pending?.deliveryId !== deliveryId) return;
      if (definite) { settle(state); state.view.status = 'current'; } else uncertain(state);
    },
    terminate(id: string): void { const state = states.get(id); if (state) settle(state); states.delete(id); },
    clearPending(): void { for (const state of states.values()) if (state.pending) uncertain(state); },
  };
}
export type ReferenceNavigation = ReturnType<typeof createReferenceNavigation>;
