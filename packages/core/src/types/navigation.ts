/** Public types for the draft NAP-NAVIGATION report/get contract.
 * @see https://github.com/napplet/naps/pull/126
 */

/** JSON data retained in an invocation; numbers must be finite at runtime. */
export type NavigationJsonValue = null | boolean | number | string | NavigationJsonValue[] | { [key: string]: NavigationJsonValue };

/** An advertised invocation representing the napplet's committed view. */
export interface NavigationLocation {
  /** Exact advertised queryless, fragment-free convention identity. */
  convention: string;
  /** Optional values keyed only by advertised parameter names. */
  payload?: Record<string, NavigationJsonValue>;
  /** Plain-text display label, separate from invocation parameters. */
  title?: string;
}

/** A committed location report; the runtime owns the history and cursor. */
export type NavigationReport = {
  /** Positive increasing revision; identical retries reuse their revision. */
  revision: number;
  /** Intent delivery responsible for this transition, omitted for local changes. */
  deliveryId?: string;
} & ({ location: NavigationLocation; mode?: 'push' | 'replace' } | { location: null; mode?: never });

/** One runtime-assigned visit, including repeated visits to the same location. */
export interface NavigationEntry {
  id: string;
  location: NavigationLocation;
}

/** Complete retained history for one running instance. */
export interface NavigationView {
  entries: NavigationEntry[];
  index: number | null;
  reportRevision: number | null;
  status: 'unreported' | 'current' | 'pending' | 'uncertain';
}

/** Report or read rejection supplied by the runtime. */
export interface NavigationError {
  code: 'invalid' | 'unsupported' | 'stale' | 'denied' | 'limit';
  message?: string;
}

/** Structured operation result, including the view after a rejection. */
export type NavigationResult =
  | { ok: true; view: NavigationView; error?: never }
  | { ok: false; view: NavigationView; error: NavigationError };

/** Injected report/get API; the runtime supplies history and requires intent. */
export interface NavigationApi {
  /**
   * Report an already committed view without requesting navigation.
   * @param report Monotonic report of actual state.
   * @returns Acceptance or rejection and the resulting retained view.
   * @example const result = await navigation.report({ revision: 1, location: null });
   */
  report(report: NavigationReport): Promise<NavigationResult>;
  /**
   * Read this instance's complete retained history.
   * @returns Operation result and the runtime's current view.
   * @example const result = await navigation.get();
   */
  get(): Promise<NavigationResult>;
}
