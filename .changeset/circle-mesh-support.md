---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/sdk": minor
"@napplet/shim": minor
"@napplet/conformance": minor
"@napplet/vite-plugin": minor
---

Support the proposed NAP-MESH circle interface with typed info, publish, subscribe, and blob-count operations. Export the mesh SDK and layered NAP subpaths, install mesh only when selected by the runtime, and recognize its envelopes and manifest declarations in tooling. Circle pairing, signing, storage, forwarding, and blob availability remain host responsibilities; these packages do not implement a peer-to-peer transport.

Allow omitted `tags` and `created_at` in the shared `EventTemplate` input so the canonical mesh publish examples type-check. Signed `NostrEvent` fields remain required.
