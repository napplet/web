---
"@napplet/vite-plugin": minor
---

Stop emitting the `napplet-aggregate-hash` meta tag into `index.html`. A file
cannot contain a hash that covers itself (the hash includes `index.html`), so the
tag was either empty or — when a signing key was set — written back *after* the
hash was computed, leaving the advertised hash permanently inconsistent with the
file. It is also not a NIP-5D/5A artifact. The aggregate hash now lives only in
the external `.nip5a-manifest.json` and the signed kind-35129 event, where the
shell/relay reads it; removing the post-hash rewrite makes that manifest
internally consistent.
