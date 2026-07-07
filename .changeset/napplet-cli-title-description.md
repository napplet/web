---
"@napplet/cli": minor
---

Read the built `index.html` at deploy time and emit the NIP-5A single-value `["title", …]` and `["description", …]` manifest tags from its plain-HTML `<title>` element and `<meta name="description">` element. Values are entity-decoded and trimmed; empty or missing values emit no tag, at most one of each is emitted, and the tags propagate to root, named, and companion snapshot manifests alongside the existing `requires` passthrough.
