---
status: complete
commit: e55a2aa8
---

# Register keyboard actions for compatibility

Added the user's recommendation across the make, design, build, SDK, port, and test skills: for maximum compatibility, register keyboard-bound actions through NAP-KEYS, including app-local shortcuts and game controls. The SDK reference explains stable action IDs, labels, default-key hints, callbacks, and teardown. The test skill covers assigned bindings, rebinding, duplicate local handlers, and absent-domain fallbacks. Ordinary text input remains outside action registration.

This is non-normative authoring guidance linked to the living [NAP-KEYS proposal](https://github.com/napplet/naps/pull/9), read at current head before editing. No protocol or SDK behavior changed. The agent-skills guide and an existing contract test carry the recommendation through the workflow. No package changeset is needed.

## Verification

- Skills and onboarding contracts: 16 passed.
- `pnpm build`: 12 tasks passed.
- `pnpm type-check`: 18 tasks passed.
- `pnpm -r test:unit`: passed, including 192 CLI tests.
- Assembled SPA/docs link crawl: 25 internal URLs checked, no broken links. The initial default-port invocation reached an unrelated local service; rerunning against this task's assembled site on a dedicated port passed.
- AI-slop scan: 95/100, zero errors. Existing findings: long CLI output function, conformance nesting, and an fflate advisory. None of those files or dependency versions changed; no rule disabled.
- `git diff --check`: passed.

Work is isolated on `docs/skills-keyboard-actions`; original-checkout WIP is untouched. Commit `e55a2aa8` contains the skills, docs, and regression contract.
