/**
 * Runtime-side shim package for installing `window.napplet` domain objects.
 *
 * The shim is for shell and test-runtime code that needs to inject callable
 * `window.napplet.<domain>` objects before a sandboxed napplet runs. It does not
 * sign events, store user data, open sockets, or fetch bytes itself; those
 * operations stay behind the host shell and are reached through postMessage
 * envelope helpers.
 *
 * Most shell runtimes should prefer `@napplet/shim/prelude`, which requires an
 * explicit domain allowlist:
 *
 * ```ts
 * import { renderNappletRuntimePreludeCall } from "@napplet/shim/prelude";
 *
 * const activatePrelude = renderNappletRuntimePreludeCall({
 *   domains: ["identity", "storage", "outbox"],
 * });
 * ```
 *
 * The root `@napplet/shim` entrypoint remains a compatibility surface for
 * bundles and tests that intentionally want the side-effect installer:
 *
 * ```ts
 * import { installNappletGlobal } from "@napplet/shim";
 *
 * installNappletGlobal({ domains: ["identity", "storage"] });
 * await window.napplet.storage.setItem("theme", "dark");
 * ```
 *
 * JSR publishes the ESM source helpers, including `@napplet/shim/prelude`. The
 * generated `prelude.global` browser artifact is npm-only.
 *
 * @packageDocumentation
 */

export type { NappletShimInstallOptions } from './runtime.js';
export { installNappletGlobal } from './runtime.js';

import { installNappletGlobal } from './runtime.js';

installNappletGlobal();
