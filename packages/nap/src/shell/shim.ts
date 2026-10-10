/** Optional shell readiness, retaining one environment per endpoint lifecycle. */
import type { NappletGlobal, ShellApi, ShellEnvironment, Subscription } from '@napplet/core';
import { postToShell } from '../boundary.js';

let installed = false;
let environment: ShellEnvironment | undefined;
const readyHandlers = new Set<(environment: ShellEnvironment) => void>();
const waiters = new Set<(environment: ShellEnvironment) => void>();

/**
 * Query injected domain presence without waiting for an environment.
 * @param domain Bare domain name
 * @returns Whether the injected namespace currently exposes the domain object
 * @example
 * supports('theme');
 */
export function supports(domain: string): boolean {
  const napplet = (window as Window & { napplet?: NappletGlobal }).napplet;
  if (!napplet || !Object.hasOwn(napplet, domain)) return false;
  const value = (napplet as Record<string, unknown>)[domain];
  return typeof value === 'object' && value !== null;
}

/**
 * Await the retained environment; this call does not send readiness traffic.
 * @returns The environment snapshot
 * @example
 * const environment = await ready();
 */
export function ready(): Promise<ShellEnvironment> {
  if (environment) return Promise.resolve(environment);
  return new Promise((resolve) => { waiters.add(resolve); });
}

/**
 * Receive the retained environment once.
 * @param handler Callback for environment delivery
 * @returns Subscription handle
 * @example
 * onReady(({ services }) => showServices(services));
 */
export function onReady(handler: (snapshot: ShellEnvironment) => void): Subscription {
  if (environment) handler(environment);
  else readyHandlers.add(handler);
  return { close(): void { readyHandlers.delete(handler); } };
}

/** The injected optional shell object. */
export const shell: ShellApi = {
  supports,
  ready,
  onReady,
  get services() { return environment?.services ?? []; },
};

/**
 * Retain the first valid environment; snapshots never change domain exposure.
 * @param msg Parent-authenticated envelope
 * @returns Nothing
 * @example
 * handleShellMessage({ type: 'shell.init', capabilities: { domains: ['shell'] }, services: [] });
 */
export function handleShellMessage(msg: { type: string; [key: string]: unknown }): void {
  if (msg.type !== 'shell.init' || environment) return;
  const capabilities = msg.capabilities as { domains?: unknown } | undefined;
  if (!Array.isArray(capabilities?.domains) || !capabilities.domains.every((item) => typeof item === 'string')) return;
  if (!Array.isArray(msg.services) || !msg.services.every((item) => typeof item === 'string')) return;
  environment = { capabilities: { domains: [...capabilities.domains] }, services: [...msg.services] };
  const callbacks = [...waiters, ...readyHandlers];
  waiters.clear();
  readyHandlers.clear();
  for (const callback of callbacks) callback(environment);
}

/**
 * Signal readiness after the runtime installs its receiver.
 * @returns Cleanup for an endpoint lifecycle
 * @example
 * const cleanup = installShellShim();
 */
export function installShellShim(): () => void {
  if (installed) return () => undefined;
  installed = true;
  postToShell({ type: 'shell.ready' });
  return () => {
    installed = false;
    environment = undefined;
    readyHandlers.clear();
    waiters.clear();
  };
}
