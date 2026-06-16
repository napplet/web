---
"@napplet/conformance": patch
---

Manifest validator fixes found by dogfooding against a real boilerplate build:
- Decode HTML entities when reading `<meta>` content, so an escaped config schema
  (the build plugin serializes JSON with `&quot;`) parses the same way a real
  `getAttribute('content')` would — previously it failed as "not valid JSON".
- Remove the `napplet-aggregate-hash` check entirely. A napplet cannot contain
  its own aggregate hash, and the tag is not a spec artifact; the shell computes
  the hash from the served files. The catalog drops to 13 checks.
