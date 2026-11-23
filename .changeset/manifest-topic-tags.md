---
"@napplet/cli": minor
"@napplet/vite-plugin": minor
---

Add optional discovery topics, published as `["t", topic]` hashtag tags on manifest events. The CLI reads `metadata.topics` from `.napplet/config.yaml`, and `napplet init` accepts a repeatable `--topic` flag and asks for topics in the interactive wizard. The Vite plugin accepts a `topics` option. Topics are trimmed, lose a leading `#`, are lowercased and deduplicated, and empty or multi-word values are rejected.
