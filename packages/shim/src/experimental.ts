/**
 * Runtime-registered experimental (non-NAP) domains.
 *
 * A shell prototyping a capability that no NAP defines yet registers an
 * extension, then lists its domain in the `domains` it exposes. Only then does
 * `window.napplet.<domain>` appear, so the namespace still holds only what the
 * shell exposes (NIP-5D §Transport). An extension never receives the port: it
 * gets a channel that sends and receives `<domain>.*` envelopes only. Bundled
 * NAP domains can never be replaced.
 *
 * @module
 */

import { normalizeExperimentalDomains } from '@napplet/core';
import { onShellMessage, postToShell, type ShellMessage } from '@napplet/nap/boundary';

/** The scoped message channel an experimental domain extension talks through. */
export interface ExperimentalDomainChannel {
  /** The extension's domain, e.g. `mesh`. */
  readonly domain: string;
  /**
   * Send an envelope to the shell over the bound NIP-5D port.
   * @throws TypeError unless `message.type` is `<domain>.<action>`.
   */
  send(message: { type: string; [key: string]: unknown }): void;
  /**
   * Receive `<domain>.*` envelopes from the shell while the domain is exposed.
   * @returns A function that removes the listener.
   */
  onMessage(listener: (message: ShellMessage) => void): () => void;
}

/** An experimental domain implementation registered by the runtime before install. */
export interface NappletDomainExtension<Api = unknown> {
  /** Bare, non-NAP domain name. Its envelopes use `<domain>.<action>` types. */
  domain: string;
  /**
   * Build the object mounted at `window.napplet.<domain>`. Called once per
   * document, the first time the domain is exposed.
   */
  create(channel: ExperimentalDomainChannel): Api;
}

const extensions = new Map<string, NappletDomainExtension>();
const apis = new Map<string, unknown>();
const exposed = new Set<string>();
const listeners = new Map<string, Set<(message: ShellMessage) => void>>();
let routing = false;

function channelFor(domain: string): ExperimentalDomainChannel {
  const prefix = `${domain}.`;
  return Object.freeze({
    domain,
    send(message: { type: string; [key: string]: unknown }): void {
      if (typeof message?.type !== 'string' || !message.type.startsWith(prefix) || message.type.length === prefix.length) {
        throw new TypeError(`Experimental domain "${domain}" can only send ${prefix}<action> envelopes`);
      }
      postToShell(message);
    },
    onMessage(listener: (message: ShellMessage) => void): () => void {
      let set = listeners.get(domain);
      if (!set) {
        set = new Set();
        listeners.set(domain, set);
      }
      set.add(listener);
      return () => {
        set.delete(listener);
      };
    },
  });
}

function route(message: ShellMessage): void {
  const dot = message.type.indexOf('.');
  if (dot <= 0) return;
  const domain = message.type.slice(0, dot);
  if (!exposed.has(domain)) return;
  for (const listener of listeners.get(domain) ?? []) listener(message);
}

/**
 * Register an experimental domain implementation for later installation.
 *
 * Registering does not expose the domain; the runtime must also list it in
 * the `domains` it installs.
 *
 * @param extension Domain name and API factory.
 * @throws TypeError for a non-bare name, a bundled NAP domain, or a different
 *   extension already registered under the same name.
 * @example
 * ```ts
 * registerNappletDomainExtension({
 *   domain: 'mesh',
 *   create: (channel) => ({ publish: (topic: string) => channel.send({ type: 'mesh.publish', topic }) }),
 * });
 * installNappletGlobal({ domains: ['relay', 'mesh'] });
 * ```
 */
export function registerNappletDomainExtension(extension: NappletDomainExtension): void {
  if (!extension || typeof extension.create !== 'function') {
    throw new TypeError('An experimental domain extension needs a create(channel) function');
  }
  const [domain] = normalizeExperimentalDomains([extension.domain]);
  const existing = extensions.get(domain);
  if (existing && existing !== extension) {
    throw new TypeError(`Experimental domain "${domain}" is already registered`);
  }
  extensions.set(domain, extension);
}

/** True when an extension is registered for `domain`. */
export function hasDomainExtension(domain: string): boolean {
  return extensions.has(domain);
}

/**
 * Mount the registered experimental domains listed in `domains` on `napplet`
 * and route their inbound envelopes. Unregistered names are ignored.
 *
 * @param domains Domain names the runtime exposes.
 * @param napplet The namespace being installed.
 * @returns The experimental domains that were mounted.
 */
export function installExperimentalDomains(domains: Iterable<string>, napplet: Record<string, unknown>): string[] {
  exposed.clear();
  const mounted: string[] = [];
  for (const domain of domains) {
    const extension = extensions.get(domain);
    if (!extension) continue;
    if (!apis.has(domain)) apis.set(domain, extension.create(channelFor(domain)));
    napplet[domain] = apis.get(domain);
    exposed.add(domain);
    mounted.push(domain);
  }
  if (!routing && mounted.length > 0) {
    onShellMessage(route);
    routing = true;
  }
  return mounted;
}
