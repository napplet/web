/**
 * @napplet/conformance -- The ConformanceContext snapshot.
 *
 * A `ConformanceContext` is the plain-data input the check catalog runs against.
 * A host (the Playwright CLI host page, or the standalone web runtime) boots the
 * napplet in a `sandbox="allow-scripts"` iframe, injects a reference runtime, and
 * assembles this snapshot. Keeping the context as pure data means the entire check
 * suite is unit-testable without a browser.
 *
 * @packageDocumentation
 */

import type { RecordedEnvelope } from '../shell/reference-shell.js';
import type { NappletManifestEvent } from '../validators/manifest.js';

/** The sandbox attributes a host used to load the napplet iframe. */
export interface SandboxState {
  /** `allow-scripts` was present (required — scripts must run). */
  allowScripts: boolean;
  /** `allow-same-origin` was present (must be ABSENT for a conformant load). */
  allowSameOrigin: boolean;
}

/** Observations from a single boot of the napplet. */
export interface BootObservation {
  /** Uncaught error captured during boot, or `null`. */
  bootError: string | null;
  /** Envelopes the napplet emitted during this boot, recorded by the reference shell. */
  emitted: RecordedEnvelope[];
}

/**
 * Everything the check catalog needs. Hosts assemble this; tests construct it
 * directly.
 */
export interface ConformanceContext {
  /** The napplet's `index.html` bytes after resolving/loading. */
  manifestHtml: string;
  /** Signed NIP-5D manifest event, when the host resolved one. */
  manifestEvent: NappletManifestEvent | null;
  /** Sandbox attributes the host used. */
  sandbox: SandboxState;
  /** Whether `window.napplet` existed after the primary boot. */
  installedGlobal: boolean;
  /** Uncaught error during the primary (fully-capable) boot, or `null`. */
  bootError: string | null;
  /** Envelopes emitted under a fully-capable shell. */
  emitted: RecordedEnvelope[];
  /** Forbidden globals the napplet tried to access, e.g. `['window.nostr']`. */
  forbiddenGlobals: string[];
  /**
   * Observation from a second boot with no domains injected. `null` when the
   * host did not run the degraded pass.
   */
  degraded: BootObservation | null;
  /**
   * Best-effort lifecycle observation after unload. `null` when not measured.
   */
  lifecycle: { listenerLeak: boolean } | null;
}

/** A host-observable boot result (see `bootAndCollect`). */
export interface BootCollectionLike {
  installedGlobal: boolean;
  bootError: string | null;
  emitted: RecordedEnvelope[];
  degraded: BootObservation | null;
}

/** Inputs a host supplies alongside a boot collection to form a full context. */
export interface BuildContextInput {
  /** The napplet's `index.html`. */
  manifestHtml: string;
  /** Signed NIP-5D manifest event, when the host resolved one. */
  manifestEvent?: NappletManifestEvent | null;
  /** The browser-observable boot result. */
  boot: BootCollectionLike;
  /** Forbidden globals found by static analysis (e.g. `['window.nostr']`). */
  forbiddenGlobals?: string[];
  /** Sandbox attributes the host used. Defaults to the conformant `allow-scripts` only. */
  sandbox?: SandboxState;
  /** Best-effort lifecycle observation. */
  lifecycle?: { listenerLeak: boolean } | null;
}

/**
 * Assemble a full {@link ConformanceContext} from a boot collection plus the
 * host-side pieces (manifest HTML, static-analysis findings, sandbox config).
 */
export function buildContext(input: BuildContextInput): ConformanceContext {
  return {
    manifestHtml: input.manifestHtml,
    manifestEvent: input.manifestEvent ?? null,
    sandbox: input.sandbox ?? { allowScripts: true, allowSameOrigin: false },
    installedGlobal: input.boot.installedGlobal,
    bootError: input.boot.bootError,
    emitted: input.boot.emitted,
    forbiddenGlobals: input.forbiddenGlobals ?? [],
    degraded: input.boot.degraded,
    lifecycle: input.lifecycle ?? null,
  };
}

/**
 * Build a context with conformant defaults, overriding only what a test cares
 * about. Useful in unit tests and as a documented baseline shape.
 */
export function makeContext(overrides: Partial<ConformanceContext> = {}): ConformanceContext {
  return {
    manifestHtml: '',
    manifestEvent: null,
    sandbox: { allowScripts: true, allowSameOrigin: false },
    installedGlobal: true,
    bootError: null,
    emitted: [],
    forbiddenGlobals: [],
    degraded: null,
    lifecycle: null,
    ...overrides,
  };
}
