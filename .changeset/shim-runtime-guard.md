---
"@napplet/shim": minor
---

Add a runtime guard that fails loudly when a napplet is loaded outside a napplet
runtime. Importing `@napplet/shim` now detects when no runtime is present — the
napplet is a top-level page, or is embedded in a frame that never answers the
`shell.ready` → `shell.init` handshake — and renders an explanatory modal instead
of silently failing. This makes the common confusing case legible: a napplet
opened directly from a NIP-5A nsite gateway can't work, because there's no shell
to proxy Nostr access over postMessage (NIP-5D).

The modal explains why nothing loaded and links to a runtime directory
(`napplet.run`), the reference runtime (`github.com/kehto/web`), and the NIP-5D
specification. It is style-isolated in a shadow root so the napplet's own CSS
can't distort it.

Local standalone development can opt out via
`window.__NAPPLET_ALLOW_STANDALONE__ = true` (set before the shim loads) or a
`<meta name="napplet-allow-standalone">` tag in the document head.
