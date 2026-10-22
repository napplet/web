/// <reference lib="deno.ns" />

import { finalizeEvent, generateSecretKey, getPublicKey } from "npm:nostr-tools@^2.23.3/pure";
import {
  createBuildSigner,
  RedactedSecret,
  type BuildSignerServices,
  type Clock,
  type Nip46Request,
  type Nip46Response,
  type RelayClient,
  type RelayRequest,
  type SafeStatus,
} from "./index.ts";

const REMOTE_PUBKEY = "a".repeat(64);
const CLIENT_SECRET = "nbunksec1super-secret-client-material";
const BUNKER_URI = "bunker://super-secret-bunker-material";

interface Deferred<T> {
  promise: Promise<T>;
  reject(error: unknown): void;
  resolve(value: T): void;
}

function deferred<T>(): Deferred<T> {
  let reject!: (error: unknown) => void;
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function requestAt(relay: FakeRelay, index: number): Promise<Nip46Request> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const request = relay.requests[index];
    if (request) return request;
    await Promise.resolve();
  }
  throw new Error(`expected relay request ${index}`);
}

async function assertRejects(action: () => Promise<unknown>, includes: string): Promise<void> {
  try {
    await action();
  } catch (error) {
    assert(error instanceof Error, "expected an Error");
    assert(error.message.includes(includes), `expected ${JSON.stringify(error.message)} to include ${includes}`);
    return;
  }
  throw new Error("expected promise to reject");
}

class FakeClock implements Clock {
  readonly timers = new Map<number, () => void>();
  nextTimer = 0;

  now(): number {
    return 1_700_000_000;
  }

  setTimeout(callback: () => void): number {
    const handle = this.nextTimer;
    this.nextTimer += 1;
    this.timers.set(handle, callback);
    return handle;
  }

  clearTimeout(handle: unknown): void {
    this.timers.delete(handle as number);
  }

  fireNext(): void {
    const timer = this.timers.entries().next().value as [number, () => void] | undefined;
    assert(timer, "expected a pending timeout");
    this.timers.delete(timer[0]);
    timer[1]();
  }
}

class FakeRelay implements RelayClient {
  readonly requests: Nip46Request[] = [];
  closedRequests = 0;
  closedRelay = 0;
  #pending: Deferred<Nip46Response> | undefined;

  openRequest(request: Nip46Request, signal: AbortSignal): RelayRequest {
    this.requests.push(request);
    this.#pending = deferred<Nip46Response>();
    const close = (): void => {
      this.closedRequests += 1;
    };
    signal.addEventListener("abort", close, { once: true });
    return { response: this.#pending.promise, close };
  }

  respond(response: Nip46Response): void {
    assert(this.#pending, "expected a pending relay request");
    this.#pending.resolve(response);
  }

  async close(): Promise<void> {
    this.closedRelay += 1;
  }
}

function createServices(
  relay: FakeRelay,
  clock = new FakeClock(),
  remotePubkey = REMOTE_PUBKEY,
): BuildSignerServices {
  let id = 0;
  return {
    relay,
    clock,
    remotePubkey,
    requestId: () => `request-${id++}`,
    requestTimeoutMs: 10,
  };
}

function signedAuthorization(pubkeySecret: Uint8Array, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    ...finalizeEvent({
      kind: 24242,
      created_at: 1_700_000_000,
      tags: [["t", "upload"]],
      content: "upload authorization",
    }, pubkeySecret),
    ...overrides,
  };
}

Deno.test("requests only public-key access and kind-24242 signing", async () => {
  const relay = new FakeRelay();
  const userSecret = generateSecretKey();
  const signer = createBuildSigner(createServices(relay, new FakeClock(), getPublicKey(userSecret)));
  const publicKey = signer.getPublicKey();

  assert(relay.requests.length === 1, "expected one public-key request");
  assert(relay.requests[0].method === "get_public_key", "expected get_public_key only");
  assert(relay.requests[0].params.length === 0, "expected no public-key parameters");
  relay.respond({ id: "request-0", result: getPublicKey(userSecret) });
  await publicKey;

  await assertRejects(
    () => signer.signEvent({ kind: 1, created_at: 1_700_000_000, tags: [], content: "forbidden" }),
    "24242",
  );
  assert(relay.requests.length === 1, "forbidden kinds must not reach the relay");

  const signed = signer.signEvent({
    kind: 24242,
    created_at: 1_700_000_000,
    tags: [["t", "upload"]],
    content: "upload authorization",
  });
  const request = await requestAt(relay, 1);
  assert(request.method === "sign_event", "expected sign_event");
  assert(JSON.parse(request.params[0]).kind === 24242, "expected a kind-24242 request payload");
  relay.respond({ id: "request-1", result: JSON.stringify(signedAuthorization(userSecret)) });
  assert((await signed).kind === 24242, "expected verified authorization event");
});


Deno.test("rejects tampered, wrong-author, and wrong-kind signed results", async () => {
  const userSecret = generateSecretKey();
  const attackerSecret = generateSecretKey();
  const vectors = [
    { label: "tampered", event: { ...signedAuthorization(userSecret), content: "tampered" } },
    { label: "wrong author", event: signedAuthorization(attackerSecret) },
    { label: "wrong kind", event: signedAuthorization(userSecret, { kind: 1 }) },
  ];

  for (const vector of vectors) {
    const relay = new FakeRelay();
    const signer = createBuildSigner(createServices(relay, new FakeClock(), getPublicKey(userSecret)));
    const publicKey = signer.getPublicKey();
    relay.respond({ id: "request-0", result: getPublicKey(userSecret) });
    await publicKey;
    const signed = signer.signEvent({ kind: 24242, created_at: 1_700_000_000, tags: [], content: "upload" });
    await requestAt(relay, 1);
    relay.respond({ id: "request-1", result: JSON.stringify(vector.event) });
    await assertRejects(() => signed, "verification");
    assert(relay.closedRequests === 2, `${vector.label} must close the request`);
  }
});

Deno.test("uses get_public_key as the user signing identity, not the transport peer", async () => {
  const relay = new FakeRelay();
  const signer = createBuildSigner(createServices(relay));
  const otherSecret = generateSecretKey();
  const publicKey = signer.getPublicKey();

  relay.respond({ id: "request-0", result: getPublicKey(otherSecret) });
  assert(await publicKey === getPublicKey(otherSecret), "user signing key should be accepted");

  const signing = signer.signEvent({
    kind: 24242,
    created_at: 1_700_000_000,
    tags: [["t", "upload"]],
    content: "authorization",
  });
  await requestAt(relay, 1);
  relay.respond({ id: "request-1", result: JSON.stringify(signedAuthorization(otherSecret)) });
  assert((await signing).pubkey === getPublicKey(otherSecret), "signed event should bind to the user key");
});

Deno.test("closes subscriptions after remote errors, malformed responses, wrong IDs, timeouts, and explicit close", async () => {
  for (const response of [
    { id: "request-0", error: BUNKER_URI },
    { id: "request-0", result: "not-json" },
    { id: "other-request", result: "b".repeat(64) },
  ]) {
    const relay = new FakeRelay();
    const signer = createBuildSigner(createServices(relay));
    const publicKey = signer.getPublicKey();
    relay.respond(response);
    await assertRejects(() => publicKey, "signer");
    assert(relay.closedRequests === 1, "failed request must close its subscription");
  }

  const timeoutRelay = new FakeRelay();
  const timeoutClock = new FakeClock();
  const timedSigner = createBuildSigner(createServices(timeoutRelay, timeoutClock));
  const timedPublicKey = timedSigner.getPublicKey();
  timeoutClock.fireNext();
  await assertRejects(() => timedPublicKey, "timed out");
  assert(timeoutRelay.closedRequests === 1, "timeout must close the request subscription");

  await timedSigner.close();
  assert(timeoutRelay.closedRelay === 1, "explicit close must close the relay");
});

Deno.test("redacts secrets from string, JSON, inspection, status, and signer errors", async () => {
  const secret = new RedactedSecret(CLIENT_SECRET);
  const snapshots = [
    String(secret),
    JSON.stringify({ secret }),
    `${new Error(`failed ${secret}`)}`,
    Deno.inspect(secret),
  ];
  const statuses: SafeStatus[] = [];
  const relay = new FakeRelay();
  const signer = createBuildSigner({
    ...createServices(relay),
    logger: {
      info: (status: SafeStatus) => statuses.push(status),
      warn: (status: SafeStatus) => statuses.push(status),
      error: (status: SafeStatus) => statuses.push(status),
    },
  });
  const publicKey = signer.getPublicKey();
  relay.respond({ id: "request-0", error: `${CLIENT_SECRET} ${BUNKER_URI}` });
  await assertRejects(() => publicKey, "signer");

  for (const snapshot of [...snapshots, JSON.stringify(statuses)]) {
    assert(!snapshot.includes(CLIENT_SECRET), "client secret leaked into output");
    assert(!snapshot.includes(BUNKER_URI), "bunker URI leaked into output");
  }
});

Deno.test("the source entry imports without Node-only globals", async () => {
  const module = await import("./index.ts");
  assert(typeof module.createBuildSigner === "function", "expected source entry to import under Deno");
});
