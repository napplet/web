---
status: implementation-verified-gates-pending
---

# Reference runtime verification

The CLI and web host now use the maintained shim prelude, while custom browser hosts can supply its source without making the browser/JSR engine import Node assets. The fallback advertises only its implemented RESOURCE/GAMEPAD fixtures. Installation is observed separately from app errors, the first load belongs to srcdoc, and private harness observations do not enter the protocol log.

Headless `--manifest` verifies a real signed Nostr event, its structure and exact raw artifact SHA-256 before starting the browser. Both boots reuse that verified snapshot. Verification strips the library's cached-verification symbol rather than trusting a copied cache result. Debug same-origin is applied and recorded truthfully; the default sandbox remains opaque.

## Verification

- Full type-check: 19 tasks pass.
- Package/site build excluding unchanged standalone CLI: 11 tasks pass.
- Recursive units excluding standalone CLI: 468 Vitest cases pass. Conformance 128, web host 9 and CLI 33 include actual Chromium, successful bindings, independent subject/injection failures, signed remote snapshot reuse, invalid-signature rejection and truthful same-origin/missing-manifest reporting.
- JSR exports check passes. Assembled literal-file web/docs/conformance site: 25 internal URLs, no broken links. The first link invocation used the unrelated default localhost8099 and returned426; the owned correctly assembled site was checked separately and closed.
- Pinned quality scanner0.12.0: staged score97/100, zero errors, above workflow threshold70. The deep-nesting warning is reproduced on origin/main's unchanged fallback, and fflate0.8.2 is already present in origin/main. No configuration/rule was disabled; the fresh main checkout has no .aislop/config.yml despite the historical AGENTS reference.
- Actual unchanged Dryft signed catalog: 12 subjects each10pass/0fail/1skip; app-library9pass/1fail/1skip. Its remaining failure is real degraded startup (INC absent), not a reference handler failure. All manifest checks run and pass. Lifecycle remains unmeasured. Exact subject hashes, signed events and raw reports are retained in the evidence directory; no subject was rebuilt or modified.

## Pending gates

The exact `pnpm build` run compiled the two Linux targets, then failed writing the standalone Darwin x86-64 release binary with ENOSPC. The exact `pnpm -r test:unit` run reports standalone236pass/1fail/3ignored; that failure is its resolver-free test's native compilation, also ENOSPC. These are not claimed green. Roughly278MiB free remained after the scoped gates; retry those exact commands when space permits. Do not weaken or skip the test to claim full success.

The two task-generated Linux binaries were losslessly gzip-archived, their decompressed hashes verified, and only the owned raw outputs retired to recover space. Receipts retain byte hashes/modes and archive paths. No user data, existing Napplet checkout WIP, Dryft source/runtime, user5173/8080/network/old native app or VM state was changed. All owned Chromium sessions and servers closed through finally handlers. No npm publication or merge performed.

Raw evidence: /var/folders/g8/w4qrj6k57hx_3lg6ltc1k70w0000gn/T/dryft-reference-proof-b8fdj7sz. Original failing binding regression is before-bindings.txt. The first unit attempt exposed both the Vitest import.meta.resolve limitation and cached-symbol verification bypass; the corrected tests execute the real source and remain strict. Those first CLI failure excerpts are in the tool transcript, not a retained complete raw log. Later complete runs are retained without rewriting them as the earlier run.

The full Dryft UX/project goal remains active. Next downstream work is the genuine app-library absent-domain failure; physical/public/provider/full-project acceptance and standalone resource-limited gates remain open. Section customization remains separate.
