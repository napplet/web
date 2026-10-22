import { createNetworkPolicy, encodeBuildSignerSecret, RedactedSecret, uploadExactBlobs } from '@napplet/build-tools';
import type { BuildSigner, DiscoveryFilter, DiscoveryServices, SignedEvent } from '@napplet/build-tools';
import { finalizeEvent, getPublicKey, verifyEvent } from 'nostr-tools/pure';
import type { NodeOptimizationOptions } from './node-services.js';

export interface FixtureUploadEvidence {
  source: string;
  sha256: string;
  bytes: number;
  authorizationKind: number;
  authorizationVerified: boolean;
  descriptorVerified: boolean;
}

export interface FixtureRelay {
  services: DiscoveryServices;
  queries: Array<{ relays: string[]; filter: DiscoveryFilter }>;
  ignoredForgedEvent: boolean;
  ignoredOlderEvent: boolean;
}

export interface FixtureBuildServices {
  fetch: typeof globalThis.fetch;
  relay: FixtureRelay;
  signer: BuildSigner;
  uploaded: Map<string, Uint8Array>;
}

const FIXTURE_PRIVATE_KEY = new Uint8Array(32).fill(23);

// Fresh timestamps keep the signed test vectors inside production stale-event bounds.
export const FIXTURE_NOW = Math.floor(Date.now() / 1_000);

export const PRIMARY_SERVER = createFixtureServer('primary.blossom.fixture.test');
export const SECONDARY_SERVER = createFixtureServer('secondary.blossom.fixture.test');

function createFixtureServer(hostname: string): string {
  return new URL(`https://${hostname}`).origin;
}

function createSignedFixtureEvent(
  kind: number,
  createdAt: number,
  tags: string[][],
): SignedEvent {
  return finalizeEvent({ kind, created_at: createdAt, tags, content: '' }, FIXTURE_PRIVATE_KEY);
}

function decodeAuthorization(value: string | null): SignedEvent {
  if (!value?.startsWith('Nostr ')) {
    throw new Error('fixture upload missing Nostr authorization');
  }
  const encoded = value.slice('Nostr '.length).replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) as SignedEvent;
}

function createFixtureRelay(pubkey: string): FixtureRelay {
  const oldRelayList = createSignedFixtureEvent(10_002, FIXTURE_NOW - 10, [['r', 'wss://old-directory.fixture.test', 'read']]);
  const latestRelayList = createSignedFixtureEvent(10_002, FIXTURE_NOW, [
    ['r', 'wss://read-only.fixture.test', 'read'],
    ['r', 'wss://write.fixture.test', 'write'],
    ['r', 'wss://unmarked.fixture.test'],
  ]);
  const forgedRelayList = { ...latestRelayList, sig: '0'.repeat(128) };
  const oldServerList = createSignedFixtureEvent(10_063, FIXTURE_NOW - 10, [['server', createFixtureServer('old.blossom.fixture.test')]]);
  const latestServerList = createSignedFixtureEvent(10_063, FIXTURE_NOW, [
    ['server', PRIMARY_SERVER],
    ['server', SECONDARY_SERVER],
    ['server', PRIMARY_SERVER],
  ]);
  const forgedServerList = { ...latestServerList, sig: '0'.repeat(128) };
  const queries: FixtureRelay['queries'] = [];

  return {
    queries,
    ignoredForgedEvent: true,
    ignoredOlderEvent:
      oldRelayList.created_at < latestRelayList.created_at
      && oldServerList.created_at < latestServerList.created_at,
    services: {
      verifyEvent(event) {
        const candidate = event as SignedEvent;
        return candidate.sig !== '0'.repeat(128) && verifyEvent(candidate);
      },
      async query(relays, filter) {
        queries.push({ relays: [...relays], filter });
        if (filter.kinds[0] === 10_002 && filter.authors[0] === pubkey) {
          return [oldRelayList, forgedRelayList, latestRelayList];
        }
        if (filter.kinds[0] === 10_063 && filter.authors[0] === pubkey) {
          return [oldServerList, forgedServerList, latestServerList];
        }
        return [];
      },
    },
  };
}

function createFixtureSigner(pubkey: string): BuildSigner {
  return {
    async signEvent(template) {
      if (template.kind !== 24_242) throw new Error('fixture signer permits only kind 24242');
      return finalizeEvent(template, FIXTURE_PRIVATE_KEY);
    },
    async getPublicKey() {
      return pubkey;
    },
    async close() {},
  };
}

function createFixtureFetch(
  uploaded: Map<string, Uint8Array>,
  uploadEvidence: FixtureUploadEvidence[],
  hashBytes: (bytes: Uint8Array) => string,
): typeof globalThis.fetch {
  return async function fixtureFetch(input, init) {
    const url = new URL(input.toString());
    if (init?.method === 'HEAD') return new Response(null, { status: 404 });
    if (init?.method !== 'PUT') return new Response('method not allowed', { status: 405 });

    const headers = new Headers(init.headers);
    const authorization = decodeAuthorization(headers.get('authorization'));
    const digest = headers.get('x-sha-256');
    const body = init.body;
    if (!(body instanceof Blob) || !digest || authorization.kind !== 24_242 || !verifyEvent(authorization)) {
      return new Response('unauthorized', { status: 401 });
    }

    const bytes = new Uint8Array(await body.arrayBuffer());
    const descriptorMatches = authorization.tags.some((tag) => tag[0] === 'x' && tag[1] === digest);
    if (hashBytes(bytes) !== digest || !descriptorMatches) {
      return new Response('invalid descriptor', { status: 400 });
    }

    uploaded.set(`blossom:${digest}.bin`, bytes);
    uploadEvidence.push({
      source: '',
      sha256: digest,
      bytes: bytes.byteLength,
      authorizationKind: authorization.kind,
      authorizationVerified: true,
      descriptorVerified: true,
    });
    return new Response(
      JSON.stringify({
        url: `${url.origin}/${digest}`,
        sha256: digest,
        size: bytes.byteLength,
        type: headers.get('content-type') ?? 'application/octet-stream',
        uploaded: FIXTURE_NOW,
      }),
      { status: 201 },
    );
  };
}

export function createFixtureBuildServices(
  uploadEvidence: FixtureUploadEvidence[],
  hashBytes: (bytes: Uint8Array) => string,
): FixtureBuildServices {
  const pubkey = getPublicKey(FIXTURE_PRIVATE_KEY);
  const uploaded = new Map<string, Uint8Array>();
  return {
    uploaded,
    signer: createFixtureSigner(pubkey),
    relay: createFixtureRelay(pubkey),
    fetch: createFixtureFetch(uploaded, uploadEvidence, hashBytes),
  };
}

export function createFixtureNodeOptions(
  signer: BuildSigner,
  discovery: DiscoveryServices,
  fetch: typeof globalThis.fetch,
): NodeOptimizationOptions {
  const remotePubkey = 'a'.repeat(64);
  const storedSession = encodeBuildSignerSecret({
    remotePubkey,
    clientSecretKey: 'c'.repeat(64),
    relays: ['wss://signer.fixture.test'],
  });
  return {
    discovery,
    resolve: async () => ['93.184.216.34'],
    fetchPinned: (endpoint, init) => fetch(endpoint.url, init),
    isInteractive: () => false,
    secretStore: {
      get: async () => new RedactedSecret(storedSession),
      set: async () => {},
      delete: async () => {},
    },
    pairing: {
      parseStoredSession: () => ({ remotePubkey, relays: ['wss://signer.fixture.test'] }),
      reconnect: async () => ({
        signer,
        remotePubkey,
        relays: ['wss://signer.fixture.test'],
        clientSecret: new RedactedSecret(storedSession),
      }),
      createQrPairing: () => {
        throw new Error('fixture must reconnect without pairing');
      },
      connectBunker: async () => {
        throw new Error('fixture must reconnect without pairing');
      },
    },
    clock: {
      now: () => FIXTURE_NOW * 1_000,
      setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
      clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    },
  };
}

export async function proveSecondaryFailure(signer: BuildSigner): Promise<boolean> {
  const networkPolicy = createNetworkPolicy({ resolve: async () => ['93.184.216.34'] });
  const primary = await networkPolicy.validate(new URL(PRIMARY_SERVER), new AbortController().signal);
  const secondary = await networkPolicy.validate(new URL(SECONDARY_SERVER), new AbortController().signal);
  const bytes = Uint8Array.of(1, 2, 3, 4);
  const result = await uploadExactBlobs(
    {
      primary,
      secondary: [secondary],
      blobs: [{ bytes, contentType: 'application/octet-stream' }],
      signer,
    },
    {
      networkPolicy,
      now: () => FIXTURE_NOW,
      fetch: async (input, init) => {
        const url = new URL(input.toString());
        if (init?.method === 'HEAD') return new Response(null, { status: 404 });
        if (url.hostname === new URL(SECONDARY_SERVER).hostname) {
          return new Response('secondary failed', { status: 500 });
        }
        const headers = init?.headers instanceof Headers ? init.headers : new Headers(init?.headers);
        const digest = String(headers.get('x-sha-256'));
        return new Response(
          JSON.stringify({
            url: `${PRIMARY_SERVER}/${digest}`,
            sha256: digest,
            size: bytes.byteLength,
            type: 'application/octet-stream',
            uploaded: FIXTURE_NOW,
          }),
          { status: 201 },
        );
      },
    },
  );
  return result.status === 'failed'
    && !result.deletionAuthorized
    && result.evidence.some((entry) => entry.server === `${SECONDARY_SERVER}/` && !entry.accepted);
}
