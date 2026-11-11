/**
 * NIP-5D document binding for the preview player.
 *
 * NIP-5D Identity binds a napplet to the verified document, not to its iframe: a `Window` survives same-frame
 * navigation and the injected `meta` CSP does not carry over, so a napplet could replace itself with unverified
 * content that still appears as the verified release. The player accepts one `napplet.hello` carrying exactly one
 * port from the frame it created, and removes the frame on a second hello, any other window-level message, a second
 * `load`, or the port closing. The player exposes no NAP domains, so nothing arriving on the port is answered.
 * https://github.com/nostr-protocol/nips/pull/2303
 *
 * The player also removes the frame if the napplet ever holds a nested browsing context. The srcdoc's
 * nested-context lock should make that impossible, so this is detection behind the prevention: an `about:srcdoc`
 * grandchild is a fresh realm with a working `RTCPeerConnection` that no CSP reaches. `contentWindow.length` is
 * readable across the opaque-origin boundary. This is player policy, not protocol surface.
 */

/** Why the player stopped trusting the frame. */
export type Replacement = 'second-hello' | 'window-message' | 'invalid-hello' | 'second-load' | 'port-closed' | 'nested-frame';

/** How often the player checks the frame for nested browsing contexts. */
export const NESTED_FRAME_CHECK_MS = 100;

/** Minimal frame surface the binding needs (eases testing). */
export interface FrameLike {
  readonly contentWindow: unknown;
  addEventListener(type: 'load', listener: () => void): void;
  removeEventListener(type: 'load', listener: () => void): void;
}

/** Minimal host window surface the binding needs (eases testing). */
export interface HostLike {
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
}

/** A live binding. */
export interface DocumentBinding {
  /** True once the verified document handed over its port, until the binding ends. */
  readonly bound: boolean;
  /** Resolves on the first `load` of the frame. */
  readonly loaded: Promise<void>;
  /** Stop listening and close the port, for example when the player closes. */
  release(): void;
}

/** Classify one window-level message from the frame: the port of a valid first hello, or why the frame is replaced. */
function handoff(event: MessageEvent, alreadyBound: boolean): MessagePort | Replacement {
  const type = (event.data as { type?: unknown } | null)?.type;
  if (type !== 'napplet.hello') return 'window-message';
  if (alreadyBound) return 'second-hello';
  const ports = event.ports ?? [];
  return ports.length === 1 ? ports[0] : 'invalid-hello';
}

/**
 * Watch a player frame for evidence that its verified document was replaced.
 * Call before setting `srcdoc` so the bootstrap's hello and the first `load` are observed.
 * @param frame The iframe the player created.
 * @param host The player's window.
 * @param onReplaced Called once with the reason; remove the frame here.
 * @param checkMs Interval for the nested-frame check.
 * @returns The live binding.
 * @example const binding = bindPlayerFrame(frame, window, reason => frame.remove());
 */
export function bindPlayerFrame(frame: FrameLike, host: HostLike, onReplaced: (reason: Replacement) => void, checkMs = NESTED_FRAME_CHECK_MS): DocumentBinding {
  let port: MessagePort | null = null;
  let watch: ReturnType<typeof setInterval> | undefined;
  let loads = 0;
  let ended = false;
  let markLoaded!: () => void;
  const loaded = new Promise<void>(resolve => { markLoaded = resolve; });

  const release = () => {
    ended = true;
    host.removeEventListener('message', onMessage);
    frame.removeEventListener('load', onLoad);
    if (watch !== undefined) clearInterval(watch);
    watch = undefined;
    if (port) { port.onmessage = null; port.close(); }
    port = null;
  };
  const replaced = (reason: Replacement) => {
    if (ended) return;
    release();
    onReplaced(reason);
  };

  function onMessage(event: MessageEvent) {
    if (ended || event.source !== frame.contentWindow) return;
    const outcome = handoff(event, port !== null);
    if (typeof outcome === 'string') return replaced(outcome);
    port = outcome;
    // No NAP domains are exposed here; NIP-5D silently ignores unrecognized messages.
    outcome.onmessage = () => {};
    outcome.addEventListener('close', () => { if (port === outcome) replaced('port-closed'); });
    outcome.start();
  }

  function checkNested() {
    const frames = (frame.contentWindow as { length?: unknown } | null)?.length;
    if (typeof frames === 'number' && frames > 0) replaced('nested-frame');
  }

  function onLoad() {
    loads += 1;
    checkNested();
    if (ended) return;
    if (loads === 1) markLoaded();
    else replaced('second-load');
  }

  host.addEventListener('message', onMessage);
  frame.addEventListener('load', onLoad);
  watch = setInterval(checkNested, checkMs);
  return {
    get bound() { return port !== null && !ended; },
    loaded,
    release,
  };
}
