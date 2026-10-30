/** Client binding for NAP-MESH. Circle policy and transport remain shell-owned. */
import type {
  EventTemplate, NostrFilter, RelayEventResult, MeshInfo, MeshPublishOptions,
  MeshPublishResult, MeshSubscribeOptions, MeshSubscription, MeshBlobsResult,
} from '@napplet/core';
import { postToShell } from '../boundary.js';
import { hydrateResourceCache } from '../resource/shim.js';
import type { MeshInboundMessage, MeshOutboundMessage } from './types.js';

type Response = Extract<MeshInboundMessage, { type: 'mesh.info.result' | 'mesh.publish.result' | 'mesh.blobs.result' }>;
const pending = new Map<string, {
  type: Response['type'];
  resolve: (message: Response) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();
interface Listeners {
  id: string;
  event: Set<(result: RelayEventResult) => void>;
  eose: Set<(ttl: number) => void>;
  closed: Set<(reason?: string) => void>;
}
const subscriptions = new Map<string, Listeners>();
const opening = new Map<string, string>();
let installed = false;

function request<T extends Response>(
  message: MeshOutboundMessage & { id: string },
  type: T['type'],
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(message.id);
      reject(new Error(`${message.type} timed out`));
    }, 30_000);
    pending.set(message.id, { type, resolve: result => resolve(result as T), reject, timeout });
    try { postToShell(message); }
    catch (error) {
      clearTimeout(timeout);
      pending.delete(message.id);
      reject(error);
    }
  });
}

function removeSubscription(subId: string): Listeners | undefined {
  const sub = subscriptions.get(subId);
  if (sub) {
    subscriptions.delete(subId);
    opening.delete(sub.id);
  }
  return sub;
}

function closeSubscription(subId: string, reason?: string): void {
  const sub = removeSubscription(subId);
  if (sub) for (const callback of sub.closed) callback(reason);
}

function isMeshInbound(message: { type: string; [key: string]: unknown }): message is MeshInboundMessage & Record<string, unknown> {
  switch (message.type) {
    case 'mesh.info.result':
    case 'mesh.publish.result':
    case 'mesh.blobs.result':
    case 'mesh.subscribe.result':
      return typeof message.id === 'string';
    case 'mesh.event':
    case 'mesh.eose':
    case 'mesh.closed':
      return typeof message.subId === 'string';
    default:
      return false;
  }
}

/**
 * Route incoming mesh messages after the runtime's parent-source check.
 * @param message Incoming envelope from the central runtime listener.
 * @returns Nothing; unknown or uncorrelated envelopes are ignored.
 * @example handleMeshMessage({ type: 'mesh.eose', subId: 'room', ttl: 1 });
 */
export function handleMeshMessage(message: { type: string; [key: string]: unknown }): void {
  if (!isMeshInbound(message)) return;
  const msg = message;
  switch (msg.type) {
    case 'mesh.info.result':
    case 'mesh.publish.result':
    case 'mesh.blobs.result': {
      const entry = pending.get(msg.id);
      if (!entry || entry.type !== msg.type) return;
      pending.delete(msg.id);
      clearTimeout(entry.timeout);
      entry.resolve(msg);
      return;
    }
    case 'mesh.subscribe.result': {
      const subId = opening.get(msg.id);
      if (subId && typeof msg.error === 'string') closeSubscription(subId, msg.error);
      return;
    }
    case 'mesh.closed':
      closeSubscription(msg.subId, msg.reason);
      return;
    case 'mesh.event': {
      const sub = subscriptions.get(msg.subId);
      if (!sub || !msg.result?.event) return;
      opening.delete(sub.id);
      hydrateResourceCache(msg.result.sidecar?.resources);
      for (const callback of sub.event) callback(msg.result);
      return;
    }
    case 'mesh.eose': {
      const sub = subscriptions.get(msg.subId);
      if (!sub || !Number.isInteger(msg.ttl) || msg.ttl < 0 || msg.ttl > 255) return;
      opening.delete(sub.id);
      for (const callback of sub.eose) callback(msg.ttl);
      return;
    }
  }
}

/**
 * Query current circle availability and user caps.
 * @returns Circle information; rejects on shell query failure.
 * @example const status = await info();
 */
export async function info(): Promise<MeshInfo> {
  const result = await request<Extract<Response, { type: 'mesh.info.result' }>>(
    { type: 'mesh.info', id: crypto.randomUUID() }, 'mesh.info.result',
  );
  if (result.error !== undefined) throw new Error(result.error);
  if (typeof result.online !== 'boolean' || !Number.isInteger(result.peers) || !result.limits
    || !Number.isInteger(result.limits.publishTtl) || !Number.isInteger(result.limits.subscribeTtl)) {
    throw new Error('mesh.info.result missing circle information');
  }
  return { online: result.online, peers: result.peers, limits: result.limits };
}

/**
 * Publish unsigned content through the shell's circle.
 * @param template Event content for shell signing.
 * @param options Optional hop budget; zero and omission are distinct.
 * @returns Publication outcome with the effective hop budget or inline error.
 * @example await publish({ kind: 20666, content: 'ding' }, { ttl: 2 });
 */
export async function publish(template: EventTemplate, options?: MeshPublishOptions): Promise<MeshPublishResult> {
  const result = await request<Extract<Response, { type: 'mesh.publish.result' }>>(
    { type: 'mesh.publish', id: crypto.randomUUID(), event: template, ...(options?.ttl !== undefined ? { ttl: options.ttl } : {}) },
    'mesh.publish.result',
  );
  if (typeof result.ok !== 'boolean') throw new Error('mesh.publish.result missing ok');
  const value: MeshPublishResult = { ok: result.ok };
  if (result.error !== undefined) value.error = result.error;
  if (result.ok) {
    if (result.event !== undefined) value.event = result.event;
    if (result.eventId !== undefined) value.eventId = result.eventId;
    if (result.ttl !== undefined) value.ttl = result.ttl;
  }
  return value;
}

/**
 * Open a live subscription; eose marks only the end of local backlog.
 * @param filters One or more NIP-01 filters.
 * @param options Optional hop budget for circle backlog.
 * @returns Subscription with event, eose, closed and idempotent close support.
 * @example const sub = subscribe({ kinds: [9] }, { ttl: 1 });
 */
export function subscribe(filters: NostrFilter | NostrFilter[], options?: MeshSubscribeOptions): MeshSubscription {
  const id = crypto.randomUUID();
  const subId = crypto.randomUUID();
  const listeners: Listeners = { id, event: new Set(), eose: new Set(), closed: new Set() };
  subscriptions.set(subId, listeners);
  opening.set(id, subId);
  try {
    postToShell({ type: 'mesh.subscribe', id, subId, filters: Array.isArray(filters) ? filters : [filters], ...(options?.ttl !== undefined ? { ttl: options.ttl } : {}) });
  } catch (error) {
    removeSubscription(subId);
    throw error;
  }
  return {
    on(event: 'event' | 'eose' | 'closed', callback: ((result: RelayEventResult) => void) | ((ttl: number) => void) | ((reason?: string) => void)): void {
      if (!subscriptions.has(subId)) return;
      if (event === 'event') listeners.event.add(callback as (result: RelayEventResult) => void);
      else if (event === 'eose') listeners.eose.add(callback as (ttl: number) => void);
      else listeners.closed.add(callback as (reason?: string) => void);
    },
    close(): void {
      if (removeSubscription(subId)) postToShell({ type: 'mesh.close', subId });
    },
  };
}

/**
 * Ask reachable circle members about blob availability without fetching bodies.
 * @param hashes Up to 64 SHA-256 hex hashes.
 * @returns Member counts, including zeros when offline; rejects on query failure.
 * @example const availability = await blobs([artifactHash]);
 */
export async function blobs(hashes: string[]): Promise<MeshBlobsResult> {
  const result = await request<Extract<Response, { type: 'mesh.blobs.result' }>>(
    { type: 'mesh.blobs', id: crypto.randomUUID(), hashes }, 'mesh.blobs.result',
  );
  if (result.error !== undefined) throw new Error(result.error);
  if (!Number.isInteger(result.peers) || !result.blobs || typeof result.blobs !== 'object'
    || Array.isArray(result.blobs) || Object.values(result.blobs).some(count => !Number.isInteger(count))) {
    throw new Error('mesh.blobs.result missing blob counts');
  }
  return { peers: result.peers, blobs: result.blobs };
}

/**
 * Install mesh lifecycle state for the central runtime router.
 * @returns Idempotent cleanup that rejects pending calls and closes subscriptions.
 * @example const cleanup = installMeshShim();
 */
export function installMeshShim(): () => void {
  if (installed) return () => undefined;
  installed = true;
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    installed = false;
    for (const entry of pending.values()) {
      clearTimeout(entry.timeout);
      entry.reject(new Error('mesh shim disposed'));
    }
    pending.clear();
    const ids = [...subscriptions.keys()];
    subscriptions.clear();
    opening.clear();
    let failure: unknown;
    for (const subId of ids) {
      try { postToShell({ type: 'mesh.close', subId }); }
      catch (error) { failure ??= error; }
    }
    if (failure !== undefined) throw failure;
  };
}
