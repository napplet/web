---
phase: 161-ad-hoc-convention-package-contracts
reviewed: 2026-07-23T17:01:54Z
depth: deep
files_reviewed: 77
files_reviewed_list:
  - .changeset/ad-hoc-convention-contracts.md
  - .changeset/ad-hoc-convention-guidance.md
  - README.md
  - apps/docs/guide/build-note-drafts-napplet-from-boilerplate.md
  - apps/docs/guide/build-note-drafts-napplet-with-ai-agent-and-skills.md
  - apps/docs/guide/build-note-drafts-napplet.md
  - apps/docs/guide/concepts.md
  - apps/docs/guide/getting-started.md
  - apps/docs/guide/index.md
  - apps/docs/guide/nip-5d.md
  - apps/docs/naps/index.md
  - apps/docs/packages/boilerplate.md
  - apps/docs/packages/cli.md
  - apps/docs/packages/core.md
  - apps/docs/packages/nap.md
  - apps/docs/packages/sdk.md
  - apps/docs/packages/shim.md
  - package.json
  - packages/boilerplate/README.md
  - packages/cli/README.md
  - packages/cli/src/cli.ts
  - packages/cli/src/config.ts
  - packages/cli/src/init-wizard.ts
  - packages/cli/src/manifest-metadata.ts
  - packages/cli/src/mod.ts
  - packages/cli/src/output.ts
  - packages/cli/src/types.ts
  - packages/cli/tests/config_test.ts
  - packages/cli/tests/init_wizard_test.ts
  - packages/cli/tests/manifest_test.ts
  - packages/conformance-cli/README.md
  - packages/conformance/README.md
  - packages/conformance/src/shell/reference-shell.test.ts
  - packages/conformance/src/shell/reference-shell.ts
  - packages/conformance/src/validators/envelope.test.ts
  - packages/conformance/src/validators/envelope.ts
  - packages/core/README.md
  - packages/core/src/index.ts
  - packages/core/src/intent-contract.test.ts
  - packages/core/src/topics.ts
  - packages/core/src/types/global.ts
  - packages/core/src/types/global/nostr-api.ts
  - packages/core/src/types/global/service-api.ts
  - packages/core/src/types/intent.ts
  - packages/nap/README.md
  - packages/nap/src/boundary-smoke.test.ts
  - packages/nap/src/convention-uri.test.ts
  - packages/nap/src/convention-uri.ts
  - packages/nap/src/inc-compat.test.ts
  - packages/nap/src/inc/sdk.ts
  - packages/nap/src/inc/shim.ts
  - packages/nap/src/inc/types.ts
  - packages/nap/src/intent/index.ts
  - packages/nap/src/intent/sdk.ts
  - packages/nap/src/intent/shim.test.ts
  - packages/nap/src/intent/shim.ts
  - packages/nap/src/intent/types.ts
  - packages/sdk/README.md
  - packages/sdk/src/cvm.ts
  - packages/sdk/src/nap-runtime.ts
  - packages/sdk/src/nap-types.ts
  - packages/sdk/src/relay.ts
  - packages/shim/README.md
  - packages/shim/src/runtime.ts
  - packages/shim/src/shell.test.ts
  - packages/skills/README.md
  - packages/skills/skills/build-napplet/SKILL.md
  - packages/skills/skills/design-napplet/SKILL.md
  - packages/skills/skills/make-napplet/SKILL.md
  - packages/skills/src/index.test.ts
  - packages/vite-plugin/README.md
  - packages/vite-plugin/src/index.test.ts
  - packages/vite-plugin/src/manifest.ts
  - packages/vite-plugin/src/types.ts
  - pnpm-workspace.yaml
  - scripts/test-convention-contracts.mjs
  - scripts/test-convention-contracts.test.mjs
findings:
  critical: 2
  warning: 1
  info: 0
  total: 3
status: issues_found
---

# Phase 161: Code Review Report

**Reviewed:** 2026-07-23T17:01:54Z
**Depth:** deep
**Files Reviewed:** 77
**Status:** issues_found

## Summary

The queryless convention URI normalization itself is largely implemented correctly: it preserves literal `+`, rejects malformed percent encoding, fragments, duplicates, and query-plus-explicit payload; the intent shim rejects URI identity conflicts; and the changed manifest/CLI paths keep `kind:<n>` on the same queryless archetype tag. The reviewed dependency overrides resolve to the intended `js-yaml` 3.15.0/4.3.0 and PostCSS 8.5.22 versions.

However, the phase leaves an explicitly prohibited `napplet-*` HTML manifest protocol surface in the shipped plugin and newly refreshed authoring flow, and its conformance gate accepts invalid intent requests as valid. The migration also leaves public examples that subscribe to a different exact topic than they emit.

Evidence run: `pnpm test:convention-contracts`, package unit suites for nap/conformance/vite-plugin/shim/cli, and `pnpm type-check` all passed. Those green checks do not cover the findings below.

## Critical Issues

### CR-01: Shipped plugin and refreshed authoring guidance retain invented `napplet-*` manifest protocol

**File:** `packages/vite-plugin/src/manifest.ts:54`

**Issue:** The plugin still emits `napplet-type`, `napplet-requires`, and `napplet-config-schema` HTML meta tags (lines 54-97), and the phase's updated tutorials continue to instruct authors to require and inspect `napplet-type`/`napplet-requires` (for example `apps/docs/guide/build-note-drafts-napplet.md:692`). The project protocol rules expressly prohibit invented `<meta name="napplet-*">` manifest tags and identify `napplet-type` as a prior concrete conformance failure. NIP-5D/NIP-5A use the signed manifest event's tags; these HTML tags alter what a shell/toolchain must accept and therefore create non-interoperable protocol surface. The same residual also persists in `packages/vite-plugin/src/types.ts:51`, `packages/vite-plugin/README.md:84`, and `packages/skills/skills/test-napplet/SKILL.md:65`.

**Fix:** Remove the HTML meta-tag injection and all runtime/tutorial/skill checks that require it. Keep the `d`, `requires`, config, and archetype data only in the NIP-5A/NIP-5D manifest event as defined by the canonical specification. Replace the tutorial verification with inspection of the generated signed manifest tags; add a regression test that a spec-faithful `index.html` without any `napplet-*` tags builds and passes conformance.

### CR-02: Conformance marks invalid and forgeable intent requests as well-formed

**File:** `packages/conformance/src/validators/envelope.ts:210`

**Issue:** `intent.invoke` is specified only as `{ request: 'object' }`, and `validateEnvelope()` consequently returns `ok: true` for a request containing a query/fragment-bearing convention, a convention/archetype/action conflict, or caller-controlled `request.sender`. This is not just a shallow diagnostic: `ReferenceShell.handleFrom()` stores that verdict (line 390) and the conformance catalog passes the "Every emitted envelope is well-formed" check whenever every stored verdict is true (`packages/conformance/src/checks/catalog.ts:99-102`). Thus a napplet that bypasses the binding and emits a forbidden wire request can pass conformance despite violating the adopted intent contract. The reference shell later rejects some conflicts, but its recorded conformance verdict remains green; it also silently ignores `request.sender`, so the sender-forgery case remains green.

**Fix:** Add intent-specific outbound validation after the generic field-kind loop: require a non-array request record with string `archetype`, `action`, and `convention`; require a queryless/fragmentless `napplet:<archetype>/<intent>` convention matching both derived fields; and reject a `sender` member anywhere in the caller request. Add negative tests asserting `validateEnvelope(...).ok === false` for `?`, `#`, mismatched fields, and `request.sender`, then verify the catalog reports the envelopes as invalid.

## Warnings

### WR-01: Phase migration examples violate the newly required exact topic match

**File:** `packages/sdk/src/relay.ts:99`

**Issue:** The SDK example emits `napplet:profile/open` but subscribes to `profile:open` on line 101. The same stale subscription appears in the phase-reviewed INC shim and SDK examples at `packages/nap/src/inc/shim.ts:106` and `packages/nap/src/inc/sdk.ts:52`. Under the adopted rules, routing is exact after normalization, so these snippets never receive the event they show users how to send.

**Fix:** Make each paired subscription use the same stable identity:

```ts
inc.emit('napplet:profile/open', { pubkey: '...' });
const sub = inc.on('napplet:profile/open', (payload) => {
  console.log('Profile requested:', payload);
});
```

Add a documentation/example test or a shared constant so a future topic migration cannot leave only one half of a paired sample updated.

---

_Reviewed: 2026-07-23T17:01:54Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
