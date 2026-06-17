---
"@napplet/vite-plugin": minor
---

Emit NAAT archetype manifest tags (napplet/naps `ARCHETYPES.md`). Resolves #58.

- New optional `archetypes` plugin option: `Array<string | { slug: string; naps?: string[] }>`. Each entry emits one `["archetype", slug, ...naps]` tag on the kind 35129 manifest, where the string shorthand `"feed"` is equivalent to `{ slug: "feed" }`. A napplet may declare several roles; declaring none stays fully valid.
- Like the `config` tag, archetype tags are excluded from the aggregate `x` hash (NIP-5D §Identity: the aggregate is recomputed from `path` tags alone), so declaring archetypes never changes a napplet's content address.
