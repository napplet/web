/**
 * @napplet/conformance -- NIP-5D shell-side port binding for one napplet frame.
 *
 * NIP-5D Transport and Identity (https://github.com/nostr-protocol/nips/pull/2303):
 * the shell accepts a `napplet.hello` only from the `contentWindow` of an iframe
 * it created, carrying exactly one port; it binds the napplet to that port and
 * processes NAP messages only from it. A second hello, any other window-level
 * message after the handoff, a second `load` or the port closing is evidence the
 * verified document was replaced: the shell closes the port, revokes the binding
 * and removes the frame.
 *
 * @packageDocumentation
 */

/** The NIP-5D handoff message type. */
export const NAPPLET_HELLO = 'napplet.hello';

/** Evidence that the verified document was replaced or broke the transport. */
export interface TransportViolation {
  /** What the shell observed. */
  kind: 'window-message' | 'second-hello' | 'invalid-hello' | 'second-load' | 'port-closed';
  /** Human-readable detail. */
  detail: string;
  /** The window-level message data, when the violation was a message. */
  data?: unknown;
}

/** Minimal window surface the binding listens on (eases testing). */
export interface MessageWindowLike {
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
}

/** Options for {@link bindNappletPort}. */
export interface PortBindingOptions {
  /** Window that receives the frame's window-level messages. */
  host: MessageWindowLike;
  /** The `contentWindow` of the iframe the shell created. Messages from any other source are dropped. */
  source: unknown;
  /** Handle one NAP envelope from the bound port and return responses to send back over it. */
  onMessage(envelope: unknown): unknown[];
  /** Called once when the binding is revoked; the shell removes the frame here. */
  onRevoke?(violation: TransportViolation): void;
  /** Harness-only window messages from the shell's own injected scripts, never NAP traffic. */
  isInternal?(data: unknown): boolean;
}

/** A live binding. */
export interface PortBinding {
  /** True once a valid hello bound a port and until the binding is revoked. */
  readonly bound: boolean;
  /** Every violation observed, in order. Only the first one revokes. */
  readonly violations: readonly TransportViolation[];
  /** Report a violation the host observed itself, such as a second `load`. */
  revoke(violation: TransportViolation): void;
  /** Stop listening and close the port without recording a violation. */
  detach(): void;
}

function typeOf(data: unknown): string {
  return data && typeof data === 'object' && typeof (data as { type?: unknown }).type === 'string'
    ? (data as { type: string }).type
    : typeof data;
}

/**
 * Bind one napplet frame to the port its bootstrap hands over in `napplet.hello`.
 * @param options Host window, expected source and NAP handler.
 * @returns The live binding.
 * @example
 * ```ts
 * const binding = bindNappletPort({ host: window, source: iframe.contentWindow, onMessage: shell.handle, onRevoke: () => iframe.remove() });
 * ```
 */
export function bindNappletPort(options: PortBindingOptions): PortBinding {
  const violations: TransportViolation[] = [];
  let port: MessagePort | null = null;
  let revoked = false;

  const close = (): void => {
    options.host.removeEventListener('message', listener);
    if (port) {
      port.onmessage = null;
      port.close();
    }
    port = null;
  };

  const revoke = (violation: TransportViolation): void => {
    violations.push(violation);
    if (revoked) return;
    revoked = true;
    close();
    options.onRevoke?.(violation);
  };

  const listener = (event: MessageEvent): void => {
    if (revoked || event.source !== options.source) return;
    const data = event.data;
    if (options.isInternal?.(data)) return;
    const isHello = typeOf(data) === NAPPLET_HELLO;
    if (port) {
      revoke(isHello
        ? { kind: 'second-hello', detail: 'A second napplet.hello arrived after the port was bound', data }
        : { kind: 'window-message', detail: `Window-level "${typeOf(data)}" message after the napplet.hello handoff`, data });
      return;
    }
    if (!isHello) {
      revoke({ kind: 'window-message', detail: `Window-level "${typeOf(data)}" message instead of the napplet.hello handoff`, data });
      return;
    }
    const ports = event.ports ?? [];
    if (ports.length !== 1) {
      revoke({ kind: 'invalid-hello', detail: `napplet.hello carried ${ports.length} ports; exactly one is required`, data });
      return;
    }
    const bound = ports[0];
    port = bound;
    bound.onmessage = (portEvent: MessageEvent) => {
      if (port !== bound) return;
      for (const response of options.onMessage(portEvent.data)) bound.postMessage(response);
    };
    bound.addEventListener?.('close', () => {
      if (port === bound) revoke({ kind: 'port-closed', detail: 'The bound port closed' });
    });
    bound.start?.();
  };

  options.host.addEventListener('message', listener);

  return {
    get bound() {
      return port !== null && !revoked;
    },
    get violations() {
      return violations;
    },
    revoke,
    detach() {
      revoked = true;
      close();
    },
  };
}
