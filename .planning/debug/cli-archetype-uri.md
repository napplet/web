---
status: investigating
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
- next_action: Add failing regression coverage, then normalize URI inputs to the existing internal objects.

## Evidence

- Current [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md#convention-uri-normalization) derives the role from the URI. Its Manifest Catalog Contract uses independent `z` and `i` tags and requires matching roles for dispatch eligibility.
- The direct upstream fetch differs from the web tool's cached copy. The current upstream text and current main branch are used for this fix.
- Main already includes PR #228 but still requires `slug:convention` in CLI input and rejects JSON strings.
- Original checkout has unrelated workspace/config/lockfile changes and generated files. Work is isolated in `/tmp/napplet-archetype-uri`, branched from fetched `origin/main`.

## Resolution

- Pending.
