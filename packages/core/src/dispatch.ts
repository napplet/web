/**
 * @napplet/core -- NAP registration and message dispatch infrastructure.
 *
 * Provides a NAP-agnostic mechanism for NAP modules (relay, identity, storage, inc)
 * to register their domain string and a message handler function. Inbound messages
 * are dispatched to the correct NAP handler based on the domain prefix extracted
 * from `message.type` (the part before the first `.`).
 *
 * Use the {@link createDispatch} factory for isolated registries (testing,
 * multi-instance), or the module-level singleton exports ({@link registerNap},
 * {@link dispatch}, {@link getRegisteredDomains}) for the common single-registry case.
 *
 * @example
 * ```ts
 * import { registerNap, dispatch } from '@napplet/core';
 *
 * // NAP module registers its domain:
 * registerNap('relay', (msg) => {
 *   console.log('relay handler received:', msg.type);
 * });
 *
 * // Dispatch routes by domain prefix:
 * dispatch({ type: 'relay.subscribe' }); // => true, calls relay handler
 * dispatch({ type: 'identity.getPublicKey' }); // => false, no identity handler
 * ```
 *
 * @packageDocumentation
 */

import type { NappletMessage } from './envelope.js';

/**
 * Callback that a NAP module provides to handle messages in its domain.
 *
 * @param message - The envelope message whose `type` matched this handler's domain.
 *
 * @example
 * ```ts
 * const handler: NapHandler = (msg) => {
 *   console.log('Received:', msg.type);
 * };
 * ```
 */
export type NapHandler = (message: NappletMessage) => void;

/**
 * Shape returned by {@link createDispatch}. Contains the three dispatch
 * operations backed by a shared, isolated handler registry.
 */
export interface NapDispatch {
  /** Register a NAP domain handler. Throws if the domain is already registered. */
  registerNap: (domain: string, handler: NapHandler) => void;
  /** Dispatch a message to the handler matching its domain prefix. Returns `true` if handled. */
  dispatch: (message: NappletMessage) => boolean;
  /** Return all currently registered domain strings. */
  getRegisteredDomains: () => string[];
}

/**
 * Create an isolated NAP dispatch registry.
 *
 * Each call returns a fresh `{ registerNap, dispatch, getRegisteredDomains }`
 * backed by its own `Map<string, NapHandler>`. Use this factory for
 * testability or when multiple independent dispatch registries are needed.
 *
 * @returns A fresh dispatch instance with its own handler map.
 *
 * @example
 * ```ts
 * import { createDispatch } from '@napplet/core';
 *
 * const { registerNap, dispatch } = createDispatch();
 * registerNap('relay', handleRelayMessage);
 * dispatch({ type: 'relay.subscribe' }); // true
 * ```
 */
export function createDispatch(): NapDispatch {
  const handlers = new Map<string, NapHandler>();

  /**
   * Register a handler for the given NAP domain.
   *
   * @param domain - The domain string (e.g., `'relay'`, `'identity'`).
   * @param handler - Callback invoked for messages in this domain.
   * @throws {Error} If the domain is already registered.
   *
   * @example
   * ```ts
   * registerNap('identity', (msg) => { /* handle identity.* messages *\/ });
   * ```
   */
  function registerNap(domain: string, handler: NapHandler): void {
    if (handlers.has(domain)) {
      throw new Error(`NAP domain "${domain}" is already registered`);
    }
    handlers.set(domain, handler);
  }

  /**
   * Dispatch a message to the handler matching its domain prefix.
   *
   * The domain is extracted from `message.type` by splitting on the first `.`.
   * If the domain portion is empty, has no `.`, or no handler is registered,
   * the function returns `false` without throwing.
   *
   * @param message - The envelope message to dispatch.
   * @returns `true` if a handler was found and called, `false` otherwise.
   *
   * @example
   * ```ts
   * dispatch({ type: 'relay.subscribe' });  // true (if relay handler exists)
   * dispatch({ type: 'unknown.action' });   // false
   * dispatch({ type: 'malformed' });         // false (no dot)
   * ```
   */
  function dispatch(message: NappletMessage): boolean {
    const dotIndex = message.type.indexOf('.');
    if (dotIndex <= 0) return false;

    const domain = message.type.slice(0, dotIndex);
    const handler = handlers.get(domain);
    if (!handler) return false;

    handler(message);
    return true;
  }

  /**
   * Return all currently registered domain strings.
   *
   * @returns Array of domain strings in registration order.
   *
   * @example
   * ```ts
   * getRegisteredDomains(); // ['relay', 'identity']
   * ```
   */
  function getRegisteredDomains(): string[] {
    return Array.from(handlers.keys());
  }

  return { registerNap, dispatch, getRegisteredDomains };
}

const _default = createDispatch();

/**
 * Register a handler for the given NAP domain on the default registry.
 *
 * @param domain - The domain string (e.g., `'relay'`, `'identity'`).
 * @param handler - Callback invoked for messages in this domain.
 * @throws {Error} If the domain is already registered.
 *
 * @example
 * ```ts
 * import { registerNap } from '@napplet/core';
 * registerNap('relay', (msg) => console.log(msg));
 * ```
 */
export const registerNap: NapDispatch['registerNap'] = _default.registerNap;

/**
 * Dispatch a message on the default registry.
 *
 * @param message - The envelope message to dispatch.
 * @returns `true` if a handler was found and called, `false` otherwise.
 *
 * @example
 * ```ts
 * import { dispatch } from '@napplet/core';
 * dispatch({ type: 'relay.subscribe' }); // true if relay handler registered
 * ```
 */
export const dispatch: NapDispatch['dispatch'] = _default.dispatch;

/**
 * Return all registered domain strings from the default registry.
 *
 * @returns Array of domain strings.
 *
 * @example
 * ```ts
 * import { getRegisteredDomains } from '@napplet/core';
 * getRegisteredDomains(); // ['relay', 'identity']
 * ```
 */
export const getRegisteredDomains: NapDispatch['getRegisteredDomains'] = _default.getRegisteredDomains;
