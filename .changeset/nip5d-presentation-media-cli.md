---
"@napplet/cli": patch
---

Deploy the current NIP-5D presentation media and source pins: upload blobs referenced by `screenshot` and `preview` tags, publish local files from `metadata.screenshots` and `metadata.preview`, pin `metadata.sourceCommit` and `metadata.sourceArchive`, accept `nostr://` source overrides, attach the automatically captured deploy screenshot to current manifests as a `screenshot` tag, refuse media entries clients would ignore, and prune unusable media during `migrate`.
