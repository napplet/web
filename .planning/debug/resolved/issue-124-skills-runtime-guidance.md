---
status: resolved
trigger: "https://github.com/napplet/web/issues/124"
created: "2026-07-09"
updated: "2026-07-09"
---

# Debug Session: issue-124-skills-runtime-guidance

## Symptoms

### Expected behavior

`packages/skills` guidance should steer generated napplets toward the current
SDK/runtime contract: use current `@napplet/sdk` wrappers for app domain calls,
avoid declaring optional enhancements as hard manifest `requires`, keep direct
`window.napplet.*` access framed as low-level/internal, keep outbox option
examples synchronized with current TypeScript declarations, and include runtime
handshake-oriented verification.

### Actual behavior

The issue reports that `build-napplet`, `make-napplet`, `design-napplet`, and
`port-nostr-app` guidance can lead agents to direct domain reads during boot,
property-presence checks as a capability model, hard `keys` manifest
requirements for optional key reservation, stale outbox option examples, and
static-only verification that misses real shell/runtime handshake failures.

### Error messages

No single thrown error is reported. The failure mode is generated napplet code
that looks reasonable in source review but fails in a real shell/runtime
startup path or over-constrains manifest requirements.

### Timeline

Issue #124 was opened on 2026-07-06 against the current skills guidance.

### Reproduction

Follow the affected skills' authoring guidance to create or port a napplet that
uses optional domains, outbox calls, key reservation, or startup capability
checks, then run it in a real shell/runtime handshake instead of only checking a
static bundle.

## Current Focus

- hypothesis: The package skill markdown contains stale or over-broad guidance
  that treats direct `window.napplet` calls and property checks as equivalent to
  SDK wrappers, encourages hard requirements for optional domains, or names
  outbox options inconsistent with current declarations.
- test: Compare the affected skill markdown against current `@napplet/sdk` and
  `@napplet/nap/outbox` declarations, then add a regression fixture or test that
  guards against optional-domain hard requirements or pre-handshake capability
  checks.
- expecting: Targeted docs/test updates resolve the issue without inventing new
  protocol surface.
- next_action: inspect affected skills and current SDK/runtime declarations.

## Evidence

- Live GitHub issue #124 was OPEN on 2026-07-09 and named the affected package
  as `packages/skills`, especially `build-napplet`, `make-napplet`,
  `design-napplet`, and `port-nostr-app`.
- Code graph search over current runtime/source packages found no
  `shell.ready`, `shell.supports`, `window.napplet.shell`, or `NappletShell`
  implementation surface under `packages/core`, `packages/shim`,
  `packages/sdk`, or `packages/nap`.
- `packages/shim/src/runtime.ts` `installNappletGlobal()` synchronously assigns
  the created `NappletGlobal` to `window.napplet`, installs the message
  listener, then installs each requested domain shim.
- Current outbox option declarations in `packages/core/src/types/outbox.ts`:
  `OutboxEventOptions` has `author`, `relays`, and `timeoutMs`;
  `OutboxQueryOptions` has `authors`, `relays`, `limit`, and `timeoutMs`;
  `OutboxSubscribeOptions` extends `OutboxQueryOptions`;
  `OutboxPublishOptions` has `relays` and `targetAuthors`.
- The stale text scan over `packages/skills` and
  `apps/docs/packages/skills.md` no longer finds the prior positive guidance
  strings `availability gates`, `capability gating via domain presence`,
  `domain-presence gating`, `Capability checks are property checks`,
  `Equivalently call window.napplet`, or
  `Examples below use whichever`. Remaining matches are negative regression
  assertions only.
- `packages/skills/src/index.test.ts` now fails if the affected authoring
  skills lose the current runtime-contract clarification, if `keys` hard
  requirements are reintroduced without the fallback caveat, if outbox option
  fields drift back to stale names, or if the shipped package README regains
  availability-gate/capability-gating language.

## Eliminated

- `shell.ready()` / `shell.supports(...)` are not current package APIs. The fix
  clarifies their absence instead of inventing a replacement handshake.
- Direct `window.napplet.<domain>.*` calls are no longer presented as equivalent
  to SDK wrapper calls in the affected skills.
- `keys` is no longer presented as a routine hard `requires` domain when local
  buttons, menus, text input, click/tap controls, or app-local fallback
  shortcuts preserve the core workflow.
- Stale outbox fields such as publish `timeoutMs`, subscribe `live`,
  `strategy`, and `outbox.eose` are called out as forbidden by the current
  guidance.

## Resolution

Updated `packages/skills` authoring guidance and the docs package mirror so
generated napplets are steered toward the current SDK/runtime package contract:

- app implementation calls should use `@napplet/sdk` wrappers;
- direct `window.napplet?.domain` checks are only optional-domain fallback
  checks after runtime injection;
- current packages do not expose `window.napplet.shell`, `shell.ready()`, or
  `shell.supports(...)`;
- manifest `requires` entries are hard boot requirements, not feature wishes;
- `keys` belongs in `requires` only when the napplet cannot function without
  shell-managed reserved keybindings;
- outbox examples/checklists match the current TypeScript option declarations;
- scenario testing now includes optional-domain fallback behavior and exact
  current outbox option fields.

Verification completed:

- `pnpm --filter @napplet/skills test:unit -- src/index.test.ts`
- `pnpm --filter @napplet/skills type-check`
- `pnpm --filter @napplet/skills build`
- `pnpm --filter @napplet/skills test:unit`
- `pnpm type-check`
- `pnpm build`
- `pnpm -r test:unit`
- `pnpm lint` (no lint tasks configured)
- `pnpm check:jsr`
- `git diff --check`
- assembled `site/` like `.github/workflows/link-check.yml`, served it on
  `http://localhost:8099`, then `node scripts/check-links.mjs
  http://localhost:8099` checked 20 internal URLs with no broken links
- `pnpm dlx aislop@0.12.0 scan --json .` exited 0 with score 82 / Healthy
  and only pre-existing warnings outside this diff
- `pnpm dlx aislop@0.12.0 scan --changes --json .` exited 0 with score 98 /
  Healthy; the only warning is the pre-existing root `js-yaml` advisory through
  the Changesets dependency chain
