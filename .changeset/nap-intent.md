---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/shim": minor
"@napplet/sdk": minor
---

Add NAP-INTENT, archetype intent dispatch. Napplets can now invoke another
napplet by its role (archetype) through `window.napplet.intent` (`invoke`,
`open`, `available`, `handlers`, `onChanged`) without addressing it directly.
The shell resolves the archetype to an installed napplet (honoring the user's
default-handler preference), creates or focuses its window, and delivers the
payload using the named NAP-N protocol. Routing (`archetype`) and payload format
(`protocol`) are orthogonal; the shell owns resolution, default handling, window
lifecycle, and the cross-napplet trust boundary.

- `@napplet/core`: `intent` domain added to `NapDomain`/`NAP_DOMAINS`, `intent`
  surface added to `NappletGlobal`, plus the intent value types.
- `@napplet/nap`: new `@napplet/nap/intent` domain (types/shim/sdk subpaths) with
  request/response correlation and an availability-change listener.
- `@napplet/shim`: mounts `window.napplet.intent` and routes `intent.*` envelopes.
- `@napplet/sdk`: `intent` namespace, `intent*` helpers, and INTENT type re-exports.
