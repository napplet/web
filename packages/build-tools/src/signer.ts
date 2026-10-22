/**
 * Least-authority NIP-46 signer core for Blossom upload authorization.
 *
 * The injected relay adapter owns NIP-44 encryption and kind-24133 relay
 * transport. This module owns canonical request correlation, kind boundaries,
 * signed-event verification, timeout handling, and deterministic cleanup.
 */

import { verifyEvent } from "nostr-tools/pure";
import type {
  BuildSigner,
  BuildSignerServices,
  Nip46Request,
  Nip46Response,
  RelayRequest,
  SignedEvent,
  UnsignedEvent,
} from "./contracts.ts";

const BLOSSOM_AUTHORIZATION_KIND = 24242;
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const PUBLIC_KEY_PATTERN = /^[0-9a-f]{64}$/;

interface ActiveRequest {
  abort(): void;
}

function isSignedEvent(value: unknown): value is SignedEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<SignedEvent>;
  return typeof event.id === "string" &&
    typeof event.pubkey === "string" &&
    typeof event.sig === "string" &&
    typeof event.kind === "number" &&
    typeof event.created_at === "number" &&
    typeof event.content === "string" &&
    Array.isArray(event.tags) &&
    event.tags.every((tag) => Array.isArray(tag) && tag.every((value) => typeof value === "string"));
}

function parseSignedEvent(result: string): SignedEvent {
  try {
    const value: unknown = JSON.parse(result);
    if (!isSignedEvent(value) || !verifyEvent(value)) {
      throw new Error("invalid signed event");
    }
    return value;
  } catch {
    throw new Error("Remote signer response verification failed");
  }
}

function safeError(services: BuildSignerServices, code: string, message: string): Error {
  services.logger?.error({ code, message });
  return new Error(message);
}

/**
 * Create a signer that can retrieve its user public key and sign only Blossom
 * kind-24242 authorization events through a pre-connected NIP-46 relay.
 *
 * @param services - Injected relay, clock, remote identity, and safe logging services.
 * @returns A verifier-backed signer that deterministically closes its relay work.
 * @example
 * ```ts
 * const signer = createBuildSigner({ relay, clock, remotePubkey, requestId: crypto.randomUUID });
 * const event = await signer.signEvent({ kind: 24242, created_at: 1, tags: [], content: "upload" });
 * await signer.close();
 * ```
 */
export function createBuildSigner(services: BuildSignerServices): BuildSigner {
  const active = new Set<ActiveRequest>();
  let closed = false;
  let publicKey: Promise<string> | undefined;
  const request = createRequest(services, active, () => closed);

  async function getPublicKey(): Promise<string> {
    if (!publicKey) {
      publicKey = request("get_public_key", []).then((response) => {
        const result = response.result;
        if (!result || !PUBLIC_KEY_PATTERN.test(result)) {
          throw safeError(services, "signer-public-key", "Remote signer response verification failed");
        }
        return result;
      });
      publicKey.catch(() => {
        publicKey = undefined;
      });
    }
    return await publicKey;
  }

  return {
    async getPublicKey(): Promise<string> {
      return await getPublicKey();
    },

    async signEvent(template: UnsignedEvent): Promise<SignedEvent> {
      if (template.kind !== BLOSSOM_AUTHORIZATION_KIND) {
        throw safeError(services, "signer-kind", "Build signer only authorizes kind 24242 events");
      }
      const expectedPubkey = await getPublicKey();
      const response = await request("sign_event", [JSON.stringify(template)]);
      const event = parseSignedEvent(response.result!);
      if (event.kind !== BLOSSOM_AUTHORIZATION_KIND || event.pubkey !== expectedPubkey) {
        throw safeError(services, "signer-event", "Remote signer response verification failed");
      }
      return event;
    },

    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      for (const request of active) request.abort();
      active.clear();
      await services.relay.close();
    },
  };
}

function createRequest(
  services: BuildSignerServices,
  active: Set<ActiveRequest>,
  isClosed: () => boolean,
): (method: Nip46Request["method"], params: string[]) => Promise<Nip46Response> {
  return async (method, params) => {
    if (isClosed()) throw safeError(services, "signer-closed", "Build signer is closed");
    const controller = new AbortController();
    const activeRequest: ActiveRequest = { abort: () => controller.abort() };
    active.add(activeRequest);
    let pending: RelayRequest | undefined;
    let timeout: unknown;
    let timedOut = false;
    try {
      const request: Nip46Request = { id: services.requestId(), method, params, remotePubkey: services.remotePubkey };
      pending = services.relay.openRequest(request, controller.signal);
      const timeoutResponse = new Promise<never>((_resolve, reject) => {
        timeout = services.clock.setTimeout(() => {
          timedOut = true;
          controller.abort();
          reject(safeError(services, "signer-timeout", "Remote signer request timed out"));
        }, services.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS);
      });
      const aborted = new Promise<never>((_resolve, reject) => {
        controller.signal.addEventListener("abort", () => {
          if (!timedOut) reject(safeError(services, "signer-aborted", "Build signer request aborted"));
        }, { once: true });
      });
      const response = await Promise.race([pending.response, timeoutResponse, aborted]);
      if (response.id !== request.id || response.result === undefined) {
        throw safeError(services, "signer-response", "Remote signer response verification failed");
      }
      if (response.error !== undefined) throw safeError(services, "signer-rejected", "Remote signer rejected request");
      return response;
    } finally {
      if (timeout !== undefined) services.clock.clearTimeout(timeout);
      active.delete(activeRequest);
      if (!controller.signal.aborted) await pending?.close();
    }
  };
}
