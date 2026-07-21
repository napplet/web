---
status: resolved
trigger: "https://github.com/napplet/web/issues/139"
created: "2026-07-09"
updated: "2026-07-09"
---

# Debug Session: issue-139-outbox-resource-sidecars

## Symptoms

### Expected behavior

When an OUTBOX event result carries resource sidecars for event-linked
resources, the higher-level shim should seed those sidecars into NAP-RESOURCE
before returning the OUTBOX result to application code. Then app code can call
`resource.bytes(url)` for a URL referenced by the returned event and have the
injected resource surface resolve from the delivered sidecar.

### Actual behavior

The OUTBOX result is exposed to the app, but attached resource sidecars are not
registered with NAP-RESOURCE. `resource.bytes(url)` can fail unless the app
duplicates lower-level sidecar-registration glue.

### Error messages

No concrete thrown message in the issue. The minimal failure is
`resource.bytes(referencedUrl)` failing after an OUTBOX query response included
a matching resource sidecar.

### Timeline

Reported against `@napplet/shim@0.26.3` and `@napplet/sdk@0.24.1` on
2026-07-06.

### Reproduction

1. Runtime sends an OUTBOX query response containing one event plus a resource
   sidecar for a URL referenced by that event.
2. App reads the event from `outbox.query(...)`.
3. App calls `resource.bytes(referencedUrl)`.
4. `resource.bytes(...)` fails because the sidecar was not registered by
   `@napplet/shim`.

## Current Focus

- hypothesis: OUTBOX shim handlers return `RelayEventResult`/`OutboxResult`
  payloads without passing any attached resource sidecars to the resource shim's
  sidecar store.
- test: Add a regression that simulates an OUTBOX query result with a resource
  sidecar, calls `window.napplet.outbox.query`, then resolves the same URL via
  `window.napplet.resource.bytes`.
- expecting: The current test fails before the fix and passes after sidecar
  hydration is wired through the shared shim.
- next_action: inspect resource/outbox types and runtime shim registration path.

## Evidence

- timestamp: 2026-07-09T19:58:00Z
  observation: `packages/nap/src/outbox/shim.ts` imports
    `hydrateResourceCache` from `../resource/shim.js`.
- timestamp: 2026-07-09T19:58:00Z
  observation: `handleGetEventResult`, `handleQueryResult`, and
    `handleSubEvent` each call `hydrateResourceCache(...sidecar?.resources)`
    before resolving/calling application callbacks.
- timestamp: 2026-07-09T19:58:00Z
  observation: `@napplet/shim@0.26.6` live JSR source imports
    `@napplet/nap@^0.27.3/outbox/shim` and
    `@napplet/nap@^0.27.3/resource/shim` into the same runtime module.
- timestamp: 2026-07-09T19:58:00Z
  observation: `@napplet/nap@0.27.3` live JSR source contains the same
    OUTBOX hydration calls.
- timestamp: 2026-07-09T19:58:00Z
  observation: Published-package Deno proof imported
    `jsr:@napplet/nap@0.27.3/outbox/shim` and
    `jsr:@napplet/nap@0.27.3/resource/shim`; after an
    `outbox.query.result` with a resource sidecar, `resource.bytes(url)`
    returned `"sidecar ok"` and posted zero `resource.bytes` requests.
- timestamp: 2026-07-09T19:58:00Z
  observation: Added a local regression test in
    `packages/nap/src/outbox/shim.test.ts` covering the issue reproduction.
- timestamp: 2026-07-09T19:58:00Z
  observation: `pnpm --filter @napplet/nap test:unit --
    src/outbox/shim.test.ts` passed with 24 test files and 118 tests.

## Eliminated

- hypothesis: Current source still lacks OUTBOX-to-RESOURCE sidecar hydration.
  result: eliminated; current source and live JSR package both hydrate
    `sidecar.resources` in OUTBOX result handlers.

## Resolution

- root_cause: Issue #139 was reported against older published package versions;
    current source and published `@napplet/nap@0.27.3` already seed OUTBOX
    resource sidecars into the shared resource shim cache. The missing piece in
    this branch was regression coverage tying the issue reproduction to tests.
- fix: Added an outbox shim regression test that simulates an
    `outbox.query.result` carrying `sidecar.resources`, awaits `query(...)`,
    then proves `resource.bytes(url)` resolves from the sidecar without posting
    a `resource.bytes` shell request.
- verification: Published JSR Deno proof returned `{"events":1,"text":"sidecar
    ok","resourceRequests":0}`; targeted `@napplet/nap` unit test passed.
- files_changed: `packages/nap/src/outbox/shim.test.ts`;
    `.planning/debug/resolved/issue-139-outbox-resource-sidecars.md`.
