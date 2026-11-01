---
quick_id: 261101-e9i
date: 2026-11-01
status: complete
---

# Napshot NIP-05 relay hints

Added `wss://relay.napplet.soy/` and `wss://relay.primal.net/` under Napshot's public key in `relays`. Both URLs come from the signature-verified kind 10002 event `ab47c2c3d95696ef4bfc88e2edd06986757b63580dfedbe331b88fccfce16a42`, retrieved from both relays. Both also serve the signed profile advertising `napshot@napplet.run`.

Updated the assembly fixture to include relay hints and the publication regression test to require the exact mapping. The test failed with the original document and passes with the fix. The web README documents the source and how to maintain the static hints.

Verification: assembly tests 5/5; `pnpm build`, `pnpm type-check`, and `pnpm -r test:unit` pass. Built conformance with `/conformance/`, assembled the full site, and confirmed `site/.well-known/nostr.json` matches the public source byte-for-byte. Pinned `aislop@0.12.0`: 100/100, zero findings across 357 files. `git diff --check` passes. Implementation commit: `ad002741`.

No package release is needed for this static private web artifact. Bunny CORS configuration is separate operational work.
