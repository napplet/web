import { describe, expect, it } from 'vitest';
import {
  BUILD_SIGNER_SESSION_KEY,
  RedactedSecret,
  type BuildSigner,
  type BuildSignerSession,
  type Clock,
  type ProcessAdapter,
  type ProcessResult,
  type SafeStatus,
  type SecretStore,
  type TerminalAdapter,
} from '@napplet/build-tools';
import { createNodeOptimizationServices } from './node-services.js';

const REMOTE_PUBKEY = 'a'.repeat(64);
const USER_PUBKEY = 'b'.repeat(64);
const NBUNKSEC = 'nbunksec1not-for-output';
const BUNKER_URI = `bunker://${REMOTE_PUBKEY}?secret=not-for-output`;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

class FakeClock implements Clock {
  readonly timers = new Map<number, () => void>();
  #next = 0;

  now(): number {
    return 1_700_000_000_000;
  }

  setTimeout(callback: () => void): number {
    const handle = this.#next++;
    this.timers.set(handle, callback);
    return handle;
  }

  clearTimeout(handle: unknown): void {
    this.timers.delete(handle as number);
  }
}

class FakeTerminal implements TerminalAdapter {
  readonly statuses: SafeStatus[] = [];
  readonly qr: string[] = [];
  readonly inputs: AbortSignal[] = [];
  readonly input = deferred<string>();

  async showQr(value: string): Promise<void> {
    this.qr.push(value);
  }

  readLine(_prompt: string, signal: AbortSignal): Promise<string> {
    this.inputs.push(signal);
    if (signal.aborted) return Promise.reject(new Error('cancelled'));
    signal.addEventListener('abort', () => this.input.reject(new Error('cancelled')), { once: true });
    return this.input.promise;
  }

  writeStatus(status: SafeStatus): void {
    this.statuses.push(status);
  }
}

class FakeStore implements SecretStore {
  value: RedactedSecret | undefined;
  writes = 0;
  readonly fail = false;

  get(_key: string): Promise<RedactedSecret | undefined> {
    return Promise.resolve(this.value);
  }

  set(_key: string, value: RedactedSecret): Promise<void> {
    this.writes += 1;
    this.value = value;
    return Promise.resolve();
  }

  delete(_key: string): Promise<void> {
    this.value = undefined;
    return Promise.resolve();
  }
}

function session(secret = NBUNKSEC): BuildSignerSession {
  const signer: BuildSigner = {
    getPublicKey: () => Promise.resolve(USER_PUBKEY),
    signEvent: () => Promise.reject(new Error('not used')),
    close: () => Promise.resolve(),
  };
  return {
    signer,
    clientSecret: new RedactedSecret(secret),
    remotePubkey: REMOTE_PUBKEY,
    relays: ['wss://relay.example'],
  };
}

function safeSnapshots(values: unknown[]): string {
  return values.map((value) => JSON.stringify(value)).join('\n');
}

describe('Node optimization services', () => {
  it('reconnects a stored session without prompting, otherwise pairs by QR or paste and persists only the verified winner', async () => {
    const store = new FakeStore();
    store.value = new RedactedSecret(NBUNKSEC);
    const terminal = new FakeTerminal();
    let reconnects = 0;
    const restored = createNodeOptimizationServices({
      clock: new FakeClock(),
      secretStore: store,
      terminal,
      pairing: {
        parseStoredSession: () => ({ remotePubkey: REMOTE_PUBKEY, relays: ['wss://relay.example'] }),
        reconnect: async () => {
          reconnects += 1;
          return session();
        },
        createQrPairing: () => ({ uri: 'nostrconnect://public?secret=not-for-output', waitForSession: () => Promise.resolve(session()), close: () => {} }),
        connectBunker: async () => session(),
      },
    });

    const reused = await restored.getSigner();
    expect(reused.status).toBe('ready');
    if (reused.status === 'ready') {
      expect(reused.remotePubkey).toBe(REMOTE_PUBKEY);
      await expect(reused.signer.getPublicKey()).resolves.toBe(USER_PUBKEY);
    }
    expect(reconnects).toBe(1);
    expect(terminal.qr).toEqual([]);

    const freshStore = new FakeStore();
    const freshTerminal = new FakeTerminal();
    let qrClosed = 0;
    const fresh = createNodeOptimizationServices({
      clock: new FakeClock(),
      secretStore: freshStore,
      terminal: freshTerminal,
      isInteractive: () => true,
      pairing: {
        parseStoredSession: () => ({ remotePubkey: REMOTE_PUBKEY, relays: ['wss://relay.example'] }),
        reconnect: async () => session(),
        createQrPairing: () => ({ uri: 'nostrconnect://public?secret=not-for-output', waitForSession: () => new Promise<BuildSignerSession>(() => {}), close: () => { qrClosed += 1; } }),
        connectBunker: async (bunker) => {
          expect(bunker.withValue((value) => value)).toBe(BUNKER_URI);
          return session();
        },
      },
    });
    freshTerminal.input.resolve(BUNKER_URI);

    const paired = await fresh.getSigner();
    expect(paired.status).toBe('ready');
    if (paired.status === 'ready') {
      expect(paired.remotePubkey).toBe(REMOTE_PUBKEY);
      await expect(paired.signer.getPublicKey()).resolves.toBe(USER_PUBKEY);
    }
    expect(freshStore.writes).toBe(1);
    expect(freshTerminal.qr).toEqual(['nostrconnect://public?secret=not-for-output']);
    expect(qrClosed).toBe(1);
    expect(freshTerminal.inputs[0]?.aborted).toBe(true);
  });

  it('returns typed redaction-safe unavailable or failure results for noninteractive, store, cancellation, DNS, and HTTP errors', async () => {
    const statuses: SafeStatus[] = [];
    const unavailable = createNodeOptimizationServices({
      clock: new FakeClock(),
      terminal: new FakeTerminal(),
      secretStore: new FakeStore(),
      isInteractive: () => false,
      resolve: async () => { throw new Error('DNS resolution failed'); },
      logger: { info: () => {}, warn: (status) => statuses.push(status), error: (status) => statuses.push(status) },
    });
    const noTerminal = await unavailable.getSigner();
    expect(noTerminal).toMatchObject({ status: 'unavailable', reason: { code: 'noninteractive' } });

    const cancelled = new AbortController();
    cancelled.abort();
    const aborted = await createNodeOptimizationServices({ signal: cancelled.signal }).getSigner();
    expect(aborted).toMatchObject({ status: 'unavailable', reason: { code: 'cancelled' } });

    const brokenStore: SecretStore = {
      get: async () => { throw new Error(NBUNKSEC); },
      set: async () => {},
      delete: async () => {},
    };
    const storeFailure = await createNodeOptimizationServices({
      secretStore: brokenStore,
      terminal: new FakeTerminal(),
      isInteractive: () => false,
    }).getSigner();
    expect(storeFailure).toMatchObject({ status: 'unavailable', reason: { code: 'secret-store-unavailable' } });

    await expect(unavailable.networkPolicy.validate(new URL('https://blossom.example'), new AbortController().signal)).rejects.toThrow('DNS resolution failed');
    const response = await unavailable.fetch(new URL('https://blossom.example'), { signal: cancelled.signal });
    expect(response).toMatchObject({ status: 'failed', reason: { code: 'network-cancelled' } });

    const snapshot = safeSnapshots([statuses, noTerminal, aborted, storeFailure, response]);
    expect(snapshot).not.toContain(NBUNKSEC);
    expect(snapshot).not.toContain(BUNKER_URI);
  });

  it('pairs for the current build when protected persistence is unavailable', async () => {
    const terminal = new FakeTerminal();
    const statuses: SafeStatus[] = [];
    const brokenStore: SecretStore = {
      get: async () => { throw new Error('credential backend unavailable'); },
      set: async () => { throw new Error('credential backend unavailable'); },
      delete: async () => {},
    };
    const services = createNodeOptimizationServices({
      clock: new FakeClock(),
      secretStore: brokenStore,
      terminal,
      isInteractive: () => true,
      logger: { info: () => {}, warn: (status) => statuses.push(status), error: () => {} },
      pairing: {
        parseStoredSession: () => ({ remotePubkey: REMOTE_PUBKEY, relays: ['wss://relay.example'] }),
        reconnect: async () => session(),
        createQrPairing: () => ({
          uri: 'nostrconnect://public?secret=not-for-output',
          waitForSession: () => Promise.resolve(session()),
          close: () => {},
        }),
        connectBunker: async () => session(),
      },
    });

    const paired = await services.getSigner();
    expect(paired.status).toBe('ready');
    expect(statuses).toContainEqual(expect.objectContaining({ code: 'secret-store-ephemeral' }));
    await services.dispose();
  });

  it('keeps module import and factory creation pure until an injected boundary is used', async () => {
    let terminalReads = 0;
    let processRuns = 0;
    let resolves = 0;
    let fetches = 0;
    const processAdapter: ProcessAdapter = {
      run: async (): Promise<ProcessResult> => {
        processRuns += 1;
        return { code: 1, stdout: '', stderr: '' };
      },
    };
    const services = createNodeOptimizationServices({
      terminal: {
        showQr: async () => { terminalReads += 1; },
        readLine: async () => { terminalReads += 1; return BUNKER_URI; },
        writeStatus: () => { terminalReads += 1; },
      },
      process: processAdapter,
      resolve: async () => { resolves += 1; return ['93.184.216.34']; },
      fetch: async () => {
        fetches += 1;
        return new Response('{}');
      },
    });

    expect({ terminalReads, processRuns, resolves, fetches }).toEqual({ terminalReads: 0, processRuns: 0, resolves: 0, fetches: 0 });
    await services.networkPolicy.validate(new URL('https://blossom.example'), new AbortController().signal);
    expect(resolves).toBe(1);
    expect(fetches).toBe(0);
    await services.fetch(new URL('https://blossom.example'));
    expect(fetches).toBe(1);
  });

  it('uses injected fakes at every boundary and aborts pending pairing work deterministically', async () => {
    const controller = new AbortController();
    const terminal = new FakeTerminal();
    const pending = deferred<BuildSignerSession>();
    let qrClosed = 0;
    const services = createNodeOptimizationServices({
      signal: controller.signal,
      clock: new FakeClock(),
      secretStore: new FakeStore(),
      terminal,
      isInteractive: () => true,
      pairing: {
        parseStoredSession: () => ({ remotePubkey: REMOTE_PUBKEY, relays: ['wss://relay.example'] }),
        reconnect: async () => { throw new Error('no session'); },
        createQrPairing: () => ({ uri: 'nostrconnect://public?secret=not-for-output', waitForSession: (signal) => new Promise<BuildSignerSession>((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true })), close: () => { qrClosed += 1; } }),
        connectBunker: async () => pending.promise,
      },
    });

    const result = services.getSigner();
    controller.abort();
    await expect(result).resolves.toMatchObject({ status: 'failed', reason: { code: 'signer-unavailable' } });
    expect(qrClosed).toBe(1);
    expect(terminal.inputs[0]?.aborted).toBe(true);
    await services.dispose();
  });
});
