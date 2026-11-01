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

## Live CORS follow-up

After the user configured the Bunny CLI, added edge rule `742e1b05-d289-4c39-878a-b9fb4327acb3` to the `napplet` pull zone (`6017894`). It sets `Access-Control-Allow-Origin: *` only for `https://napplet.run/.well-known/nostr.json`; Bunny's URL trigger ignores the query string. Existing CORS extension settings remain unchanged. The rule uses the [official Edge Rule API schema](https://core-api-public-docs.b-cdn.net/docs/v3/public.json) and [documented trigger matching](https://github.com/BunnyWay/documentation/blob/main/cdn/edge-rules/trigger-path.mdx).

Verified HTTP 200 with the wildcard header both with and without `?name=napshot`, and a Chromium page at `https://example.com` successfully fetched and decoded the live document. A control request to `/docs/hashmap.json` still has no CORS header, confirming the narrow scope. The live document still has the original names-only body until PR #291 merges and deploys. Rollback is disabling or deleting this single edge rule in Bunny; no cache purge was needed.
