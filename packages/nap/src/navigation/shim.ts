/** Runtime-side transport binding for NAP-NAVIGATION; history stays in the host. */
import type { NavigationReport, NavigationResult } from '@napplet/core';
import { postToShell } from '../boundary.js';
import type { NavigationOutboundMessage } from './types.js';

const REQUEST_TIMEOUT_MS = 30_000;
const pending = new Map<string, {
  type: NavigationOutboundMessage['type'];
  resolve: (result: NavigationResult) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();
let installed = false;

function isResult(value: unknown): value is NavigationResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as Record<string, unknown>;
  if (!result.view || typeof result.view !== 'object') return false;
  const view = result.view as Record<string, unknown>;
  if (!Array.isArray(view.entries) || typeof view.status !== 'string' || !['unreported', 'current', 'pending', 'uncertain'].includes(view.status)) return false;
  if (view.index !== null && (typeof view.index !== 'number' || !Number.isInteger(view.index) || view.index < 0 || view.index >= view.entries.length)) return false;
  if (view.reportRevision !== null && (typeof view.reportRevision !== 'number' || !Number.isInteger(view.reportRevision) || view.reportRevision <= 0)) return false;
  if (result.ok === true) return !('error' in result);
  if (result.ok !== false || !result.error || typeof result.error !== 'object') return false;
  const error = result.error as Record<string, unknown>;
  return typeof error.code === 'string' && ['invalid', 'unsupported', 'stale', 'denied', 'limit'].includes(error.code)
    && (!('message' in error) || typeof error.message === 'string');
}

/**
 * Route a result already authenticated by the runtime's central listener.
 * @param message Parent-sourced navigation envelope.
 * @returns Nothing; a matching pending operation is settled once.
 * @example handleNavigationMessage({ type: 'navigation.get.result', id, result });
 */
export function handleNavigationMessage(message: { type: string; [key: string]: unknown }): void {
  if (typeof message.id !== 'string') return;
  const request = pending.get(message.id);
  if (!request || message.type !== `${request.type}.result`) return;
  pending.delete(message.id);
  clearTimeout(request.timeout);
  if (isResult(message.result)) request.resolve(message.result);
  else request.reject(new Error(`invalid ${message.type}`));
}

function send(message: NavigationOutboundMessage): Promise<NavigationResult> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pending.delete(message.id)) reject(new Error(`${message.type} timed out`));
    }, REQUEST_TIMEOUT_MS);
    pending.set(message.id, { type: message.type, resolve, reject, timeout });
    try {
      postToShell(message);
    } catch (error) {
      pending.delete(message.id);
      clearTimeout(timeout);
      reject(error);
    }
  });
}

/**
 * Send the caller's committed location without assigning revisions or history.
 * @param report Actual state and caller-assigned revision.
 * @returns Structured acceptance or rejection from the runtime.
 * @example await report({ revision: 1, location: null });
 */
export function report(report: NavigationReport): Promise<NavigationResult> {
  return send({ type: 'navigation.report', id: crypto.randomUUID(), report });
}

/**
 * Read retained history for this endpoint.
 * @returns Structured runtime view result.
 * @example const result = await get();
 */
export function get(): Promise<NavigationResult> {
  return send({ type: 'navigation.get', id: crypto.randomUUID() });
}

/**
 * Activate lifecycle cleanup without sending requests or installing browser hooks.
 * @returns Cleanup that rejects pending requests and releases timers.
 * @example const cleanup = installNavigationShim();
 */
export function installNavigationShim(): () => void {
  if (installed) return () => undefined;
  installed = true;
  return () => {
    for (const request of pending.values()) {
      clearTimeout(request.timeout);
      request.reject(new Error('navigation shim uninstalled'));
    }
    pending.clear();
    installed = false;
  };
}
