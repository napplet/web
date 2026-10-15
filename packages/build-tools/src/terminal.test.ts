/// <reference lib="deno.ns" />

import {
  pairBuildSigner,
  reconnectBuildSigner,
  RedactedSecret,
  type BuildSigner,
  type BuildSignerSession,
  type Clock,
  type SafeStatus,
  type SecretStore,
  type TerminalAdapter,
} from "./index.ts";

const REMOTE_PUBKEY = "a".repeat(64);
const USER_PUBKEY = "b".repeat(64);
const NBUNKSEC = "nbunksec1do-not-print";
const BUNKER_URI = `bunker://${REMOTE_PUBKEY}?secret=do-not-print`;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

class FakeClock implements Clock {
  readonly timers = new Map<number, () => void>();
  #id = 0;

  now(): number {
    return 1;
  }

  setTimeout(callback: () => void): number {
    const id = this.#id++;
    this.timers.set(id, callback);
    return id;
  }

  clearTimeout(handle: unknown): void {
    this.timers.delete(handle as number);
  }
}

class FakeTerminal implements TerminalAdapter {
  readonly statuses: SafeStatus[] = [];
  readonly qr: string[] = [];
  readonly prompts: AbortSignal[] = [];
  readonly input = deferred<string>();
  failOnPaired = false;

  async showQr(value: string): Promise<void> {
    this.qr.push(value);
  }

  readLine(_prompt: string, signal: AbortSignal): Promise<string> {
    this.prompts.push(signal);
    return this.input.promise;
  }

  writeStatus(message: SafeStatus): void {
    if (this.failOnPaired && message.code === "signer-paired") {
      throw new Error("status output failed");
    }
    this.statuses.push(message);
  }
}

class FakeStore implements SecretStore {
  value: RedactedSecret | undefined;
  writes = 0;
  failWrites = false;

  get(_key: string): Promise<RedactedSecret | undefined> {
    return Promise.resolve(this.value);
  }

  set(_key: string, value: RedactedSecret): Promise<void> {
    this.writes += 1;
    if (this.failWrites) return Promise.reject(new Error("secret store failed"));
    this.value = value;
    return Promise.resolve();
  }

  delete(_key: string): Promise<void> {
    this.value = undefined;
    return Promise.resolve();
  }
}

function session(secret = NBUNKSEC, onClose: () => void = () => {}): BuildSignerSession {
  const signer: BuildSigner = {
    getPublicKey: () => Promise.resolve(REMOTE_PUBKEY),
    signEvent: () => Promise.reject(new Error("not used")),
    close: () => {
      onClose();
      return Promise.resolve();
    },
  };
  return { signer, clientSecret: new RedactedSecret(secret), remotePubkey: REMOTE_PUBKEY, relays: ["wss://relay.test"] };
}

Deno.test("pairing accepts a distinct user signing key for its remote transport peer", async () => {
  const terminal = new FakeTerminal();
  const mismatched = session();
  mismatched.signer.getPublicKey = () => Promise.resolve(USER_PUBKEY);
  let closed = false;
  mismatched.signer.close = () => { closed = true; return Promise.resolve(); };
  const pending = pairBuildSigner({
    clock: new FakeClock(),
    terminal,
    createQrPairing: () => ({ uri: "nostrconnect://test", waitForSession: () => Promise.resolve(mismatched), close: () => {} }),
    connectBunker: () => Promise.reject(new Error("not used")),
  });
  terminal.input.reject(new Error("terminal input closed"));
  const paired = await pending;
  assert(paired.signer === mismatched.signer, "distinct signing key should remain usable");
  assert(!closed, "accepted signer must not be closed");
});

Deno.test("QR and pasted bunker pairing race to one verified stored session", async () => {
  const clock = new FakeClock();
  const terminal = new FakeTerminal();
  const store = new FakeStore();
  const qr = deferred<BuildSignerSession>();
  let qrClosed = 0;
  let pastedAborted = false;
  const result = pairBuildSigner({
    clock,
    terminal,
    secretStore: store,
    createQrPairing: () => ({
      uri: "nostrconnect://public?secret=do-not-print",
      waitForSession: () => qr.promise,
      close: () => { qrClosed += 1; },
    }),
    connectBunker: (_bunker, signal) => {
      signal.addEventListener("abort", () => { pastedAborted = true; }, { once: true });
      return Promise.resolve(session());
    },
  });
  terminal.input.resolve(BUNKER_URI);
  const winner = await result;

  assert(winner.remotePubkey === REMOTE_PUBKEY, "pasted path should pair");
  assert(store.writes === 1, "only the verified winner should persist");
  assert(qrClosed === 1, "losing QR work should close");
  assert(terminal.prompts[0].aborted || pastedAborted, "losing work should be aborted");
  void qr;
});

Deno.test("a late pairing loser that ignores abort closes once without replacing the winner", async () => {
  const terminal = new FakeTerminal();
  const lateQr = deferred<BuildSignerSession>();
  let winnerCloses = 0;
  let loserCloses = 0;
  const winner = session(NBUNKSEC, () => { winnerCloses += 1; });
  const loser = session("nbunksec1late-loser", () => { loserCloses += 1; });
  const pending = pairBuildSigner({
    clock: new FakeClock(),
    terminal,
    createQrPairing: () => ({
      uri: "nostrconnect://public",
      waitForSession: () => lateQr.promise,
      close: () => {},
    }),
    connectBunker: () => Promise.resolve(winner),
  });
  terminal.input.resolve(BUNKER_URI);

  const selected = await pending;
  assert(selected.signer === winner.signer, "the pasted winner must remain selected");
  assert(await selected.signer.getPublicKey() === REMOTE_PUBKEY, "the selected winner must remain usable");

  lateQr.resolve(loser);
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  assert(loserCloses === 1, "the late QR loser must close exactly once");
  assert(winnerCloses === 0, "the late loser must not close or replace the winner");
});

Deno.test("failed pairing paths preserve a stored session and redact every safe surface", async () => {
  const clock = new FakeClock();
  const terminal = new FakeTerminal();
  const store = new FakeStore();
  store.value = new RedactedSecret(NBUNKSEC);
  const pending = pairBuildSigner({
    clock,
    terminal,
    secretStore: store,
    createQrPairing: () => ({
      uri: "nostrconnect://public?secret=do-not-print",
      waitForSession: () => Promise.reject(new Error(BUNKER_URI)),
      close: () => {},
    }),
    connectBunker: () => Promise.reject(new Error(NBUNKSEC)),
  });
  terminal.input.resolve(BUNKER_URI);
  await pending.catch(() => {});

  const snapshots = [JSON.stringify(terminal.statuses), Deno.inspect(terminal.statuses), String(store.value)];
  for (const snapshot of snapshots) {
    assert(!snapshot.includes(NBUNKSEC), "nbunksec must stay out of terminal snapshots");
    assert(!snapshot.includes(BUNKER_URI), "bunker URI must stay out of terminal snapshots");
  }
  assert(store.writes === 0, "failed pairing must not replace prior material");
});

Deno.test("post-pairing failures close QR and pasted winners exactly once", async () => {
  for (const flow of ["qr", "paste"] as const) {
    for (const failure of ["store", "status"] as const) {
      const terminal = new FakeTerminal();
      terminal.failOnPaired = failure === "status";
      const store = new FakeStore();
      store.failWrites = failure === "store";
      let closes = 0;
      const winner = session(NBUNKSEC, () => { closes += 1; });
      const waitingQr = deferred<BuildSignerSession>();
      const pending = pairBuildSigner({
        clock: new FakeClock(),
        terminal,
        secretStore: store,
        createQrPairing: () => ({
          uri: "nostrconnect://public",
          waitForSession: () => flow === "qr" ? Promise.resolve(winner) : waitingQr.promise,
          close: () => {},
        }),
        connectBunker: () => flow === "paste"
          ? Promise.resolve(winner)
          : Promise.reject(new Error("unused pasted path")),
      });
      if (flow === "paste") terminal.input.resolve(BUNKER_URI);

      await pending.then(
        () => { throw new Error(`${flow} ${failure} failure must reject`); },
        (error) => assert(error instanceof Error && error.message === "Remote signer session could not be saved", "failure must be safely redacted"),
      );
      assert(closes === 1, `${flow} ${failure} failure must close its verified signer exactly once`);
    }
  }
});

Deno.test("reconnect reads the stable key before pairing and validates the returned identity", async () => {
  const store = new FakeStore();
  store.value = new RedactedSecret(NBUNKSEC);
  let parsed = 0;
  const restored = await reconnectBuildSigner({
    secretStore: store,
    parseStoredSession: (secret) => {
      parsed += 1;
      assert(secret.withValue((value) => value === NBUNKSEC), "stored value should be provided only in parser callback");
      return { remotePubkey: REMOTE_PUBKEY, relays: ["wss://relay.test"] };
    },
    reconnect: () => Promise.resolve(session()),
  });
  assert(restored?.remotePubkey === REMOTE_PUBKEY, "validated session should reconnect");
  assert(parsed === 1, "stored session should parse before reconnecting");
});
