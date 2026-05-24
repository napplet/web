// @napplet/nub/class -- Class NUB shim (wire handler for class.assigned envelope).
//
// Registers a central-dispatcher-compatible handler that consumes shell->napplet
// `class.assigned` envelopes and writes the integer into module-local state,
// exposed via Object.defineProperty getter on window.napplet.class.
//
// Per NUB-CLASS.md wire contract:
// - Shell sends AT MOST ONE class.assigned per napplet lifecycle.
// - Shell sends after iframe ready, before any other napplet-bound envelope.
// - Napplet MUST treat duplicate envelopes as protocol violations (we accept
//   last-write-wins silently -- idempotent re-assignment is scaffolding for
//   future dynamic-class extension, not an invitation to use it in v1).
// - Invalid shapes (non-integer class, negative class, missing field) are
//   silently dropped per graceful-degradation.

type ClassWindow = Window & typeof globalThis & {
  napplet?: Record<string, unknown> & { class?: number };
};

type ClassMessageInput = { type: string; id?: unknown; class?: unknown };

/** Current assigned class. Undefined until first valid class.assigned arrives. */
let currentClass: number | undefined = undefined;

/** Double-install guard. */
let installed = false;

/**
 * Handle class.* messages from the shell. Called by the central shim dispatcher
 * (Phase 139 wires @napplet/shim to route envelopes here via registerNub).
 *
 * The only v1 message is `class.assigned` (shell -> napplet, terminal).
 * Invalid shapes or unknown actions are silently dropped.
 *
 * @param msg  A parsed envelope object with at least a `type` string field
 */
export function handleClassMessage(msg: ClassMessageInput): void {
  if (msg.type !== 'class.assigned') return;
  const value = msg.class;
  // Defensive validation -- spec says non-negative integer, silently drop invalid.
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return;
  }
  currentClass = value;
}

/**
 * Install the class shim: mount `window.napplet.class` as a readonly getter
 * over the module-local `currentClass` state.
 *
 * Graceful degradation contract: `window.napplet.class` is `undefined` until
 * the first valid `class.assigned` envelope arrives. It is NEVER `0` or `null`
 * by default -- napplets MUST test `=== undefined` (or use optional chaining)
 * to detect the pre-assignment state.
 *
 * Idempotent: a second call is a no-op and returns a no-op cleanup.
 *
 * Note: the actual envelope routing (registerNub) is performed by the index.ts
 * barrel so that importing `@napplet/nub/class` is sufficient for the central
 * dispatcher to route class envelopes even if `installClassShim()` is never
 * called. The installer's sole responsibility is the window mount.
 *
 * @returns cleanup function that removes the window mount and resets state.
 *
 * @example
 * ```ts
 * import { installClassShim } from '@napplet/nub/class';
 * const cleanup = installClassShim();
 * // After class.assigned envelope arrives:
 * console.log(window.napplet.class);  // number | undefined
 * cleanup();
 * ```
 */
export function installClassShim(): () => void {
  if (installed) {
    return () => { /* already installed */ };
  }

  const classWindow = window as ClassWindow;
  const napplet = classWindow.napplet ?? (classWindow.napplet = {});
  Object.defineProperty(napplet, 'class', {
    get: () => currentClass,
    enumerable: true,
    configurable: true, // configurable so cleanup() can delete below
  });

  installed = true;

  return () => {
    currentClass = undefined;
    const n = (window as ClassWindow).napplet;
    if (n) {
      try {
        delete n.class;
      } catch {
        /* best-effort */
      }
    }
    installed = false;
  };
}
