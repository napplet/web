/** Cached NAP-MOTION binding. Grants and sensor access belong to the runtime. */
import type { MotionApi, MotionPermissionResult, MotionSample, MotionState, Subscription } from '@napplet/core';
import { postToShell } from '../boundary.js';
import { createMotionStateTools } from './state.js';

const tools = createMotionStateTools();
const initial = (): MotionState => ({ available: true, permission: 'prompt', absolute: false, focused: false, frequency: 0 });
let current = initial();
let sample: MotionSample | null = null;
let installed = false;
let subscribed = false;
// IDs only correlate this binding's replies; opaque frames may lack randomUUID.
let requestSequence = 0;
type Listener<T> = { handler: (value: T) => void };
const stateHandlers = new Set<Listener<MotionState>>();
const sampleHandlers = new Set<Listener<MotionSample>>();
const pending = new Map<string, {
  resolve: (value: MotionPermissionResult) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}>();

function subscribe(): void {
  if (subscribed) return;
  subscribed = true;
  try { postToShell({ type: 'motion.subscribe' }); }
  catch (error) { subscribed = false; throw error; }
}

function listen<T>(handlers: Set<Listener<T>>, handler: (value: T) => void): Subscription {
  const entry = { handler };
  handlers.add(entry);
  try { subscribe(); }
  catch (error) { handlers.delete(entry); throw error; }
  return { close: () => { handlers.delete(entry); } };
}

function deliver<T>(handlers: Set<Listener<T>>, value: T, copy: (value: T) => T): void {
  const recipients = [...handlers];
  for (const entry of recipients) {
    if (!handlers.has(entry)) continue;
    try { entry.handler(copy(value)); }
    catch (error) { queueMicrotask(() => { throw error; }); }
  }
}

/**
 * Ask the shell for a motion grant, optionally including absolute orientation.
 * @param absolute Whether compass-referenced orientation is requested.
 * @returns The correlated outcome, including a shell error when processing fails.
 * @example const result = await requestPermission(true);
 */
export function requestPermission(absolute?: boolean): Promise<MotionPermissionResult> {
  if (absolute !== undefined && typeof absolute !== 'boolean') return Promise.reject(new TypeError('absolute must be a boolean'));
  const id = `motion-${++requestSequence}`;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (pending.delete(id)) reject(new Error('motion.permission timed out'));
    }, 30_000);
    pending.set(id, { resolve, reject, timer });
    try {
      subscribe();
      postToShell({ type: 'motion.permission', id, ...(absolute === undefined ? {} : { absolute }) });
    } catch (error) {
      clearTimeout(timer);
      pending.delete(id);
      reject(error);
    }
  });
}

/**
 * Read the latest state without waiting for the wire.
 * @returns An independent snapshot, initially prompt and unfocused.
 * @example const status = state();
 */
export function state(): MotionState { subscribe(); return tools.copyMotionState(current); }

/**
 * Read the most recent eligible sample.
 * @returns An independent reading, or null before a sample or during a pause.
 * @example const reading = latest();
 */
export function latest(): MotionSample | null { subscribe(); return sample === null ? null : tools.copyMotionSample(sample); }

/**
 * Observe complete state snapshots.
 * @param handler Receives each new state.
 * @returns An independently closable local subscription.
 * @example const subscription = onState(renderStatus);
 */
export function onState(handler: (value: MotionState) => void): Subscription { return listen(stateHandlers, handler); }

/**
 * Observe live samples while this napplet is eligible.
 * @param handler Receives each granted, focused sample.
 * @returns An independently closable local subscription.
 * @example const subscription = onSample(updateTilt);
 */
export function onSample(handler: (value: MotionSample) => void): Subscription { return listen(sampleHandlers, handler); }

/** Optional runtime-injected domain. */
export const motion: MotionApi = { requestPermission, state, latest, onState, onSample };

/**
 * Route a source-checked shell message into the motion binding.
 * @param message Incoming envelope from the parent runtime.
 * @returns Nothing; invalid or ineligible messages are ignored.
 * @example handleMotionMessage({ type: 'motion.state', ...snapshot });
 */
export function handleMotionMessage(message: { type: string; [key: string]: unknown }): void {
  if (!subscribed) return;
  if (message.type === 'motion.permission.result') {
    if (typeof message.id !== 'string' || !tools.isMotionPermissionResult(message)) return;
    const request = pending.get(message.id);
    if (!request) return;
    clearTimeout(request.timer);
    pending.delete(message.id);
    request.resolve({ permission: message.permission, absolute: message.absolute,
      ...(message.error === undefined ? {} : { error: message.error }) });
    return;
  }
  if ('id' in message) return;
  if (message.type === 'motion.state' && tools.isMotionState(message)) {
    current = tools.copyMotionState(message);
    if (!current.focused || (!current.absolute && sample?.orientation?.absolute)) sample = null;
    deliver(stateHandlers, current, tools.copyMotionState);
  } else if (message.type === 'motion.sample' && current.focused && tools.isMotionSample(message)) {
    if (message.orientation?.absolute && !current.absolute) return;
    sample = tools.copyMotionSample(message);
    deliver(sampleHandlers, sample, tools.copyMotionSample);
  }
}

/**
 * Install the binding; unused installs send no traffic.
 * @returns Idempotent teardown that unsubscribes, rejects pending requests, and clears caches.
 * @example const cleanup = installMotionShim();
 */
export function installMotionShim(): () => void {
  if (installed) return () => undefined;
  installed = true;
  let closed = false;
  return () => {
    if (closed) return;
    closed = true;
    try { if (subscribed) postToShell({ type: 'motion.unsubscribe' }); }
    finally {
      for (const request of pending.values()) {
        clearTimeout(request.timer);
        request.reject(new Error('motion binding closed'));
      }
      pending.clear();
      stateHandlers.clear();
      sampleHandlers.clear();
      current = initial();
      sample = null;
      subscribed = false;
      installed = false;
    }
  };
}
