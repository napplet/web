---
status: complete
completed: 2026-07-11
commits:
  - 06b36231
  - de1a5519
template_commit: ed38fe9
mode: quick-full
---

# Quick Task 260711-mz4 Summary

## Outcome

Generator guidance, the official build skill, Vite hard-requirement handling,
and the live boilerplate template now agree on runtime-owned domain injection,
SDK-only calls, optional-domain fallback, OUTBOX-first Nostr access, and
hard-only manifest requirements.

## Monorepo Changes

- Pointed `@napplet/boilerplate` users to the current `@napplet/skills`
  installer and living NIP-5D, NAP-OUTBOX, and NAP-RELAY sources.
- Added regression guards for app-owned shim imports, stale shell handshakes and
  probes, relay-default examples, active CONNECT/CLASS, optional `requires`, and
  vendored skill bodies.
- Removed undocumented build-time config metadata from `build-napplet` guidance
  and retained the NAP-CONFIG runtime registration path.
- Added `count` to Vite requirement validation so explicit and inferred hard
  requirements are preserved.
- Added patch changesets for `@napplet/boilerplate`, `@napplet/skills`, and
  `@napplet/vite-plugin`.

## Live Template Changes

- Updated the starter to use `@napplet/sdk` over runtime-injected domains and to
  disable optional actions when their domains are absent.
- Replaced generic RELAY querying with OUTBOX; retained RELAY only in an
  explicitly relay-local example.
- Deleted vendored Codex skill bodies and added the official package pointer.
- Removed deferred CONNECT/CLASS, stale CSP-authority wording, and private
  build-time config-schema metadata.
- Added dependency-free stale-guidance and domain-absence regression tests.

## Verification

- Monorepo: `pnpm build` (13/13), `pnpm type-check` (17/17), and
  `pnpm -r test:unit` passed.
- Focused suites: boilerplate 2/2, skills 14/14, vite-plugin 23/23.
- Template and fresh generated app: guidance 5/5, type-check, build, and
  conformance 5 passed / 0 failed / 5 skipped.
- Both repositories: exact stale scans and `git diff --check` passed; changed
  code scored 100/100 with `aislop@0.13.1`.
- Independent review approved the final template diff with no findings.

## Pull Requests

- Monorepo: https://github.com/napplet/web/pull/163
- Live template: https://github.com/napplet/boilerplate/pull/4

## Residual Risk

- Local-directory conformance does not supply manifest, wire, or lifecycle
  evidence, so those five checks skip.
- Existing package/plugin docs and several NAP proposal headers still contain
  private metadata or stale shim/`shell.supports` wording. This change flags but
  does not sweep those broader package surfaces.
