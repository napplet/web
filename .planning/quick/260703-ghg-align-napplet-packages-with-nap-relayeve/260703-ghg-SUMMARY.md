---
status: complete
date: 2026-07-03
quick_id: 260703-ghg
commit: 2ce3e3f2
---

# Quick Task 260703-ghg Summary

Aligned napplet package surfaces with the current NAP RelayEventResult sidecar model and the updated NAP-OUTBOX stream lifecycle.

## Canonical Inputs

- NIP-5D PR #2303, head `6ca56324a3764a17141e681225f0aaa0ad45a5b6`
- napplet/naps PR #2 NAP-RELAY, head `cb8f8eabb2d09439e9d174cb9eb6ef2caad0eca1`
- napplet/naps PR #13 NAP-RESOURCE, head `8e75eadf317d7fe809415e4755cd48f63cfb63f3`
- napplet/naps PR #32 NAP-OUTBOX, head `57db924bac022cc14c67d9fca1a4d92cf1bd4725`

## Changes

- Added shared core `RelayEventResult`, `RelayEventSidecar`, and `ResourceSidecarEntry` types.
- Moved relay and outbox read-style messages, SDK helpers, and shim callbacks to `RelayEventResult`.
- Removed `outbox.eose` from outbox package types, shim routing, conformance validators, tests, and the reference shell.
- Updated docs, examples, and the envelope diagram to use `result` payloads.
- Added package-local Vitest devDependencies needed for the AI-slop gate and lockfile consistency.
- Added a changeset for shipped package output changes.

## Verification

- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `git diff --check`
- `pnpm dlx aislop scan --json .`

AI-slop result: 93 / Healthy, with 0 format, lint, AI-slop, and security issues. Remaining warnings are existing code-quality size/function warnings in broad public surfaces.

## Remaining Risks

- Runtime behavior was not tested against an external shell implementation.
- The legacy `nostrdb` shim still returns raw `NostrEvent[]`; it is not a NAP relay/outbox surface and was left unchanged.
