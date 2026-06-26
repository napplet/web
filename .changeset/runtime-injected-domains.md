---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/shim": minor
"@napplet/conformance": minor
"@napplet/conformance-cli": minor
"@napplet/skills": patch
"@napplet/sdk": patch
"@napplet/vite-plugin": patch
"@napplet/conformance-web": patch
---

Align first-party packages with current NIP-5D runtime injection.

Runtimes now expose available NAPs by injecting `window.napplet.<domain>`
properties before napplet code runs. The retired generic shell capability
surface is removed from active package APIs: no `window.napplet.shell`, no
`shell.ready` / `shell.init` handshake, and no `@napplet/nap/shell` subpath.

Conformance now injects the runtime namespace before fixture code and validates
only NAP domain envelopes. Skills and package guidance now teach domain-property
presence instead of the retired shell supports API.
