---
status: complete
---
# CLI client attribution

Added exactly one ["client", "napplet.run"] tag to current and legacy root/named/snapshot manifests and optional kind-32267 application events before signing. Snapshot creation replaces inherited publisher attribution. Unsigned previews carry the same tag. HTTP authorization and signer transport events are outside this relay publication change.

NIP-89 Client tag supplies the existing attribution semantics. CLI docs updated. Created and consumed a patch changeset with pnpm version-packages; package.json, deno.json and changelog now describe CLI 0.8.9.

Validation: 39 focused tests pass, including signed current/legacy event kinds, singleton attribution, snapshot hashes and input preservation. pnpm build, pnpm type-check and pnpm -r test:unit pass. AI-slop gate is 100/100. Implementation commit 678fb834. Original checkout WIP untouched.
