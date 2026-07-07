---
quick_id: 260706-via
slug: harden-napplet-skills-against-direct-bro
status: complete
date: 2026-07-06
---

# Quick Task 260706-via: Harden napplet skills against direct browser network and storage APIs

## Goal

Make skills-using agents treat the NIP-5D sandbox as a hard authoring boundary so generated napplets do not use direct browser authority such as `fetch`, WebSocket, XHR, browser storage, external scripts, or external media loads.

## Evidence Inputs

- User screenshot shows a generated GB Color napplet failing with `network-error: NetworkError when attempting to fetch resource.`
- NIP-5D PR #2303 says napplets run as `srcdoc` under `sandbox="allow-scripts"` without `allow-same-origin`, with storage, signing, encryption, and relay access proxied through the shell.
- NAP-RESOURCE PR #13 defines `resource.bytes` / `resource.bytesMany` as the canonical sandboxed resource path and states napplets never see raw `fetch` or sockets.

## Tasks

1. Strengthen the authoring skills so the sandbox contract appears before implementation details and explicitly routes external bytes, ROMs, images, media, and persistence through NAP domains.
2. Remove direct `fetch` from `@napplet/nap/resource` data URL decoding so official helper code does not contradict the skill rule.
3. Extend conformance/static tests to flag direct browser authority surfaces in served napplet sources.
4. Run focused tests and workspace gates, then commit with lore trailers.

## Verification

- `pnpm --filter @napplet/skills test:unit`
- `pnpm --filter @napplet/nap test:unit`
- `pnpm --filter @napplet/conformance-cli test:unit`
- `pnpm --filter @napplet/conformance-cli type-check`
- `pnpm --filter @napplet/skills type-check`
- `git diff --check`

## Result

Completed in commit `e781e436`.
