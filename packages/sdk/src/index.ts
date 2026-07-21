/**
 * @napplet/sdk -- Typed named exports wrapping window.napplet.
 *
 * Provides `relay`, `inc`, `storage`, and `keys` objects that delegate
 * to `window.napplet.*` at call time. Developers using a bundler can import
 * individual namespaces without depending on napplet-side bootstrap code:
 *
 * ```ts
 * import { relay, inc } from '@napplet/sdk';
 * ```
 *
 * The runtime must inject `window.napplet` before napplet code runs. The SDK
 * only wraps it -- it does not install it.
 *
 * Domain-specific SDK helpers are also available directly from NAP packages:
 * ```ts
 * import { relaySubscribe } from '@napplet/nap/relay';
 * import { storageGetItem } from '@napplet/nap/storage';
 * ```
 *
 * @packageDocumentation
 */

// window.napplet wrapper objects, grouped by domain.
export { relay, inc, ifc, storage } from './relay.js';
export { media, notify } from './media.js';
export type { MediaContextLink, MediaNostrRef, MediaSessionContext } from './media.js';
export { keys, identity } from './keys.js';
export { config, resource } from './config.js';
export { cvm, outbox, upload, intent, webrtc } from './cvm.js';
export { link, count, lists, common, ble, serial, dm } from './services.js';

// Type-only re-exports from @napplet/core and @napplet/nap/*.
export type * from './nap-types.js';

// Value re-exports: protocol constants, shim installers, domain helpers.
export * from './nap-runtime.js';
