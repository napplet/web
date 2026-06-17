---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/shim": minor
---

Make the iframe boundary clone-safe so framework reactive values no longer fail silently.

Every NAP shim crosses the napplet ⇄ shell boundary by structured-cloning a JSON
envelope through `postMessage`. Framework reactive values — Svelte 5 `$state`, Vue
`reactive`, Solid stores — are `Proxy` objects that aren't structured-cloneable, so
`postMessage` threw a `DataCloneError` that got silently swallowed in async paths;
the envelope simply never crossed (napplet/web#67).

- **`@napplet/core`** adds `sendEnvelope`, `toCloneableSnapshot`, `setCloneMode`,
  `getCloneMode`, `clearCloneWarnings`, and the `CloneMode` / `PostMessageTarget`
  types. The default `'auto'` mode posts as-is and, only on a `DataCloneError`,
  snapshots the envelope (stripping reactive proxies while preserving binary,
  `Date`, `Map`, `Set`, and cycles) and retries — warning once. `'strict'` throws a
  loud, actionable, synchronous error instead; `'snapshot'` normalizes eagerly.
- **`@napplet/nap`** and **`@napplet/shim`** now post every envelope through this
  boundary instead of calling `window.parent.postMessage(msg, '*')` directly.

These are SDK plumbing only — the bytes placed on the wire are identical plain
envelopes, so no NAP/protocol surface changes.
