/**
 * Lazy production Nostr adapters for Vite builds.
 *
 * Nostr relay traffic and NIP-46 are handled by nostr-tools. The adapter keeps
 * one disposable pool per operation so aborting the QR half of a pairing race
 * cannot close the pasted bunker half.
 */

import {
  createBuildSigner,
  decodeBuildSignerSecret,
  encodeBuildSignerSecret,
  RedactedSecret,
  type BuildSignerSession,
  type Clock,
  type DiscoveryServices,
  type Nip46Request,
  type RelayClient,
  type RelayRequest,
} from '@napplet/build-tools';
import { BunkerSigner, createNostrConnectURI, parseBunkerInput } from 'nostr-tools/nip46';
import { SimplePool, useWebSocketImplementation as configureWebSocketImplementation } from 'nostr-tools/pool';
import { generateSecretKey, getPublicKey, verifyEvent } from 'nostr-tools/pure';
import { bytesToHex, hexToBytes } from 'nostr-tools/utils';
import WebSocket from 'ws';
import type { NodePairingAdapter } from './node-services.js';

const DEFAULT_CONNECT_RELAYS = ['wss://bucket.coracle.social'] as const;
const RELAY_QUERY_TIMEOUT_MS = 5_000;

configureWebSocketImplementation(WebSocket);

/**
 * Create the verified relay-query adapter used by automatic discovery.
 *
 * @returns A bounded Nostr query adapter that locally verifies discovered events.
 * @example
 * ```ts
 * const discovery = createNodeDiscoveryServices();
 * ```
 */
export function createNodeDiscoveryServices(): DiscoveryServices {
  return {
    verifyEvent,
    async query(relays, filter, signal): Promise<readonly unknown[]> {
      if (signal.aborted) throw new Error('Nostr discovery cancelled');
      const pool = new SimplePool();
      const relayList = [...relays];
      const abort = (): void => pool.close(relayList);
      signal.addEventListener('abort', abort, { once: true });
      try {
        return await pool.querySync(relayList, {
          kinds: [...filter.kinds],
          authors: [...filter.authors],
          limit: filter.limit,
        }, { maxWait: RELAY_QUERY_TIMEOUT_MS });
      } finally {
        signal.removeEventListener('abort', abort);
        pool.close(relayList);
      }
    },
  };
}

/**
 * Create fresh and reconnect NIP-46 adapters for terminal QR and bunker pairing.
 *
 * @param clock - Injected clock used by the narrow build signer.
 * @returns A Node pairing adapter backed by nostr-tools.
 * @example
 * ```ts
 * const pairing = createNodePairingAdapter(clock);
 * ```
 */
export function createNodePairingAdapter(clock: Clock): NodePairingAdapter {
  let pairingClientKey = generateSecretKey();
  return {
    parseStoredSession(secret): { remotePubkey: string; relays: string[] } {
      return secret.withValue((raw) => {
        const decoded = decodeBuildSignerSecret(raw);
        return { remotePubkey: decoded.remotePubkey, relays: decoded.relays };
      });
    },
    reconnect(secret, _identity, signal): Promise<BuildSignerSession> {
      return secret.withValue(async (raw) => {
        const decoded = decodeBuildSignerSecret(raw);
        const pool = new SimplePool();
        const signer = BunkerSigner.fromBunker(hexToBytes(decoded.clientSecretKey), {
          pubkey: decoded.remotePubkey,
          relays: decoded.relays,
          secret: decoded.secret ?? null,
        }, { pool });
        try {
          await raceAbort(signer.connect(), signal);
          return sessionFromSigner(signer, pool, hexToBytes(decoded.clientSecretKey), clock);
        } catch {
          await closeSigner(signer, pool, decoded.relays);
          throw new Error('Remote signer reconnect failed');
        }
      });
    },
    createQrPairing(_signal) {
      pairingClientKey = generateSecretKey();
      const pool = new SimplePool();
      const relays = [...DEFAULT_CONNECT_RELAYS];
      const uri = createNostrConnectURI({
        clientPubkey: getPublicKey(pairingClientKey),
        relays,
        secret: crypto.randomUUID(),
        perms: ['get_public_key', 'sign_event:24242'],
        name: 'napplet Vite build',
      });
      let connected: BunkerSigner | undefined;
      return {
        uri,
        async waitForSession(waitSignal): Promise<BuildSignerSession> {
          connected = await BunkerSigner.fromURI(pairingClientKey, uri, { pool }, waitSignal);
          return sessionFromSigner(connected, pool, pairingClientKey, clock);
        },
        async close(): Promise<void> {
          if (connected) await connected.close();
          pool.close(relays);
        },
      };
    },
    connectBunker(bunker, signal): Promise<BuildSignerSession> {
      return bunker.withValue(async (raw) => {
        const pointer = await parseBunkerInput(raw);
        if (!pointer || pointer.relays.length === 0) throw new Error('Invalid bunker connection');
        const pool = new SimplePool();
        const signer = BunkerSigner.fromBunker(pairingClientKey, pointer, { pool });
        try {
          await raceAbort(signer.connect(), signal);
          return sessionFromSigner(signer, pool, pairingClientKey, clock);
        } catch {
          await closeSigner(signer, pool, pointer.relays);
          throw new Error('Remote signer pairing failed');
        }
      });
    },
  };
}

function sessionFromSigner(
  signer: BunkerSigner,
  pool: SimplePool,
  clientSecretKey: Uint8Array,
  clock: Clock,
): BuildSignerSession {
  const remotePubkey = signer.bp.pubkey;
  const relays = [...signer.bp.relays];
  return {
    remotePubkey,
    relays,
    clientSecret: new RedactedSecret(encodeBuildSignerSecret({
      remotePubkey,
      clientSecretKey: bytesToHex(clientSecretKey),
      relays,
      ...(signer.bp.secret ? { secret: signer.bp.secret } : {}),
    })),
    signer: createBuildSigner({
      relay: signerRelay(signer, pool, relays),
      clock,
      remotePubkey,
      requestId: () => crypto.randomUUID(),
    }),
  };
}

function signerRelay(signer: BunkerSigner, pool: SimplePool, relays: string[]): RelayClient {
  let closed = false;
  const close = async (): Promise<void> => {
    if (closed) return;
    closed = true;
    await closeSigner(signer, pool, relays);
  };
  return {
    openRequest(request, signal): RelayRequest {
      const response = runSignerRequest(signer, request).then(
        (result) => ({ id: request.id, result }),
        () => Promise.reject(new Error('Remote signer request failed')),
      );
      signal.addEventListener('abort', () => { void close(); }, { once: true });
      return { response, close };
    },
    close,
  };
}

async function runSignerRequest(signer: BunkerSigner, request: Nip46Request): Promise<string> {
  if (request.method === 'get_public_key') return await signer.getPublicKey();
  if (request.method !== 'sign_event') throw new Error('Unsupported signer request');
  const template: unknown = JSON.parse(request.params[0] ?? '');
  if (!isEventTemplate(template)) throw new Error('Invalid signer request');
  return JSON.stringify(await signer.signEvent(template));
}

function isEventTemplate(value: unknown): value is { kind: number; created_at: number; tags: string[][]; content: string } {
  if (!value || typeof value !== 'object') return false;
  const template = value as { kind?: unknown; created_at?: unknown; tags?: unknown; content?: unknown };
  return typeof template.kind === 'number' && typeof template.created_at === 'number' &&
    typeof template.content === 'string' && Array.isArray(template.tags) &&
    template.tags.every((tag) => Array.isArray(tag) && tag.every((part) => typeof part === 'string'));
}

async function closeSigner(signer: BunkerSigner, pool: SimplePool, relays: string[]): Promise<void> {
  try {
    await signer.close();
  } finally {
    pool.close(relays);
  }
}

async function raceAbort<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) throw new Error('Remote signer operation cancelled');
  let abort!: () => void;
  const cancelled = new Promise<never>((_, reject) => {
    abort = () => reject(new Error('Remote signer operation cancelled'));
    signal.addEventListener('abort', abort, { once: true });
  });
  try {
    return await Promise.race([operation, cancelled]);
  } finally {
    signal.removeEventListener('abort', abort);
  }
}
