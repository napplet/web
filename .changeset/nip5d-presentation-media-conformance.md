---
"@napplet/conformance": patch
---

Validate the current NIP-5D manifest additions: parse `screenshot` and `preview` tags with NIP-92 `key value` fields and surface the specification's ignore rules as the advisory `manifest/media-usable` check, validate `source-commit` and `source-archive`, accept NIP-34 `nostr://` source locations, and export `parsePresentationMedia()` for shells.
