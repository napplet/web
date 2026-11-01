// Test-only NIP-5D shell double: captures the `napplet.hello` port handoff and
// speaks NAP over a synchronous fake MessageChannel. Not part of any build entry.

import { vi } from 'vitest';

type Listener = (event: { data: unknown }) => void;

class FakePort {
  other: FakePort | null = null;
  onmessage: Listener | null = null;
  closed = false;

  postMessage(data: unknown): void {
    if (this.closed) return;
    // Structured clone is what makes reactive proxies and functions throw DataCloneError.
    const copy = structuredClone(data);
    this.other?.onmessage?.({ data: copy });
  }

  start(): void {}

  close(): void {
    this.closed = true;
  }
}

class FakeMessageChannel {
  port1 = new FakePort();
  port2 = new FakePort();

  constructor() {
    this.port1.other = this.port2;
    this.port2.other = this.port1;
  }
}

/** A captured shell end of the napplet's port. */
export interface FakeShell {
  /** Envelopes the napplet sent over the port, in order. */
  readonly sent: Array<Record<string, unknown>>;
  /** `napplet.hello` handoffs seen since this shell was created. */
  readonly hellos: number;
  /** Window-level messages other than a valid hello (a NIP-5D shell would tear the frame down). */
  readonly windowMessages: unknown[];
  /** The last envelope sent, or undefined. */
  last(): Record<string, unknown> | undefined;
  /** Deliver a shell -> napplet envelope over the port, synchronously. */
  deliver(message: unknown): void;
}

// The napplet realm keeps one port for its lifetime, so the bound shell end
// outlives individual tests that share a window (happy-dom).
let shellPort: FakePort | null = null;
let active: { sent: Array<Record<string, unknown>>; hellos: number; windowMessages: unknown[] } | null = null;

function capture(message: unknown, _origin?: unknown, transfer?: unknown): void {
  const ports = Array.isArray(transfer) ? transfer : [];
  if (message && typeof message === 'object' && (message as { type?: unknown }).type === 'napplet.hello' && ports.length === 1) {
    const port = ports[0] as FakePort;
    port.onmessage = (event) => active?.sent.push(event.data as Record<string, unknown>);
    shellPort = port;
    if (active) active.hellos += 1;
    return;
  }
  active?.windowMessages.push(message);
}

/**
 * Install a fake NIP-5D shell for the current test.
 *
 * In a node environment it stubs `window` (merging `windowExtras`); in a DOM
 * environment it spies on the real `window.parent.postMessage`. Call
 * `vi.unstubAllGlobals()` / `vi.restoreAllMocks()` in `afterEach`.
 *
 * @param windowExtras Extra properties for the stubbed node `window`.
 * @returns The shell double.
 */
export function installFakeShell(windowExtras: Record<string, unknown> = {}): FakeShell {
  vi.stubGlobal('MessageChannel', FakeMessageChannel);
  const state = { sent: [] as Array<Record<string, unknown>>, hellos: 0, windowMessages: [] as unknown[] };
  active = state;
  const dom = typeof window !== 'undefined' && typeof (window as { dispatchEvent?: unknown }).dispatchEvent === 'function';
  if (dom && Object.keys(windowExtras).length === 0) {
    vi.spyOn(window.parent, 'postMessage').mockImplementation(capture as Window['postMessage']);
  } else {
    shellPort = null;
    vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {}, ...windowExtras, parent: { postMessage: capture } });
  }
  return {
    get sent() {
      return state.sent;
    },
    get hellos() {
      return state.hellos;
    },
    get windowMessages() {
      return state.windowMessages;
    },
    last: () => state.sent.at(-1),
    deliver(message) {
      if (!shellPort) throw new Error('fake shell: no napplet.hello port has been handed over yet');
      shellPort.postMessage(message);
    },
  };
}
