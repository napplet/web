---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/shim": minor
"@napplet/sdk": minor
---

Add NAP-UPLOAD, shell-mediated file/blob upload. Napplets can now upload bytes
through `window.napplet.upload` (`upload`, `status`, `onStatus`) while the
runtime selects the storage server, signs the rail authorization (NIP-98 for
NIP-96, kind 24242 for Blossom), performs the HTTP upload, and returns a stable
URL plus NIP-94 integrity metadata. Napplets never receive signing keys, server
credentials, or direct network access.

- `@napplet/core`: `upload` domain added to `NapDomain`/`NAP_DOMAINS`, `upload`
  surface added to `NappletGlobal`, plus the upload value types.
- `@napplet/nap`: new `@napplet/nap/upload` domain (types/shim/sdk subpaths) with
  request/response correlation and a status-push listener.
- `@napplet/shim`: mounts `window.napplet.upload` and routes `upload.*` envelopes.
- `@napplet/sdk`: `upload` namespace, `upload*` helpers, and UPLOAD type re-exports.
