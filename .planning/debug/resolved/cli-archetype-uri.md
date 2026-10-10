---
status: resolved
trigger: 'metadata.archetypes[0] must use slug:convention; expected napplet:note/open'
created: 2026-10-09
updated: 2026-10-09
---

# CLI archetype URI input

## Symptoms

- Expected: accept `napplet:note/open` in CLI input and JSON metadata.
- Actual: CLI requires a redundant role prefix; JSON accepts only objects and reports the CLI shorthand as its required shape.
- Reproduction: `normalizeConfig({ metadata: { archetypes: ["napplet:note/open"] } })`.

## Current Focus

- hypothesis: CLI input and JSON normalization were missed by the NAP-INTENT migration.
- test: URI input through config, wizard, CLI, and resulting manifest advertisements.
- next_action: Open the verified fix PR.

## Evidence

- Current [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md#convention-uri-normalization) derives the role from the URI. Its Manifest Catalog Contract uses independent `z` and `i` tags and requires matching roles for dispatch eligibility.
- The direct upstream fetch differs from the web tool's cached copy. The current upstream text and current main branch are used for this fix.
- Main already includes PR #228 but still requires `slug:convention` in CLI input and rejects JSON strings.
- Original checkout has unrelated workspace/config/lockfile changes and generated files. Work is isolated in `/tmp/napplet-archetype-uri`, branched from fetched `origin/main`.

## Resolution

- Root cause: CLI parsing required a redundant role prefix and JSON normalization rejected URI strings with an incorrect format hint.
- Fix: Accept direct convention URIs in both paths, derive their roles, preserve object configs and legacy CLI input, and update reports, wizard prompts, tutorials, and shipped documentation.
- Verification: Three regression failures reproduced before the fix. Afterwards, 40 focused tests passed; `pnpm build`, `pnpm type-check`, and `pnpm -r test:unit` passed (159 CLI tests); release tooling, skills contracts, and onboarding contracts passed; the rebuilt CLI 0.8.3 passed flag/config/report smoke checks; changed-code aislop scored 100/100.
- Release metadata: `pnpm version-packages` prepared CLI 0.8.3 and boilerplate 0.3.4 (shipped README correction). No local publishing.
- Scope: CLI input normalization and documentation only; existing manifest serialization and runtime intent behavior are unchanged.
