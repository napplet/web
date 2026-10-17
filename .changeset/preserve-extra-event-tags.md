---
"@napplet/cli": patch
"@napplet/conformance": patch
---

Preserve additional Nostr tags, complete payloads, and repeated values when deploying, snapshotting, signing, and migrating manifests. Keep current event content separate from extra description tags and interpret historical fields only for legacy input. Cover extensible manifests in conformance tests and validate optional source locations against NIP-5D without restricting other tag names.
