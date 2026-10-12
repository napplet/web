---
phase: quick-260912-wr8
plan: "01"
subsystem: agent-skills
tags: [skills, skills.sh, cli, docs, ui-guidance]
requires: []
provides:
  - "Eight napplet-* skills at skills/ discoverable by npx skills add napplet/napplet."
  - "napplet-ui: the applet visual contract (no title header, compact, any-size, minimum notice, whole-surface theme)."
  - "scripts/skills-contracts.test.mjs guarding names, frontmatter, cross-references, and docs."
affects: [packages/cli, packages/boilerplate, apps/docs, apps/web, README]
tech-stack:
  added: []
  patterns: ["skills.sh discovery from repo-root skills/<name>/SKILL.md"]
key-files:
  created:
    - skills/napplet-ui/SKILL.md
    - skills/napplet-sdk/SKILL.md
    - skills/napplet-interop/SKILL.md
    - scripts/skills-contracts.test.mjs
    - apps/docs/guide/agent-skills.md
    - .changeset/skills-sh-installer.md
  modified:
    - skills/napplet-{make,design,build,port,test}/SKILL.md
    - packages/cli/src/{cli,standalone,guide,output,mod}.ts
    - packages/cli/deno.json
    - packages/cli/tests/{cli_test,guide_test,resolver_free_test}.ts
    - .github/workflows/publish-jsr.yml
    - README.md, AGENTS.md, apps/docs/**, apps/web/src/**
  removed:
    - packages/skills/** (custom installer + package)
    - root skills symlink
key-decisions:
  - "Canonical skills live at repo-root skills/ as real files (skills.sh container dir); @napplet/skills is retired because its only code was the installer."
  - "napplet skills CLI subcommand removed rather than stubbed; napplet guide and init output print the skills.sh command."
  - "Docs page moved from /packages/skills to /guide/agent-skills because it is no longer a package."
requirements-completed: [QUICK-260912-wr8]
duration: 90min
completed: 2026-09-12
status: complete
---

# Quick Task 260912-wr8: Skills for skills.sh Summary

**The napplet agent skills install with `npx skills add napplet/napplet`, carry intuitive `napplet-*` names, and now teach the applet UI contract that agents kept getting wrong.**

## Accomplishments

- Replaced make/design/build/port/test with eight focused skills; split the SDK reference and INC/intent conventions out so a single-task invocation does not load unrelated text.
- Added `napplet-ui` and routed every workflow skill through it: no title header (runtime shows the name), compact tool density, tiers from `<240px` to `>900px` plus short heights, a CSS-driven minimum-size notice only when a floor truly exists, whole-surface NAP-THEME, and a four-frame verification checklist.
- Removed the `napplet skills` subcommand, the `@napplet/skills` package, the compile `--include`, and the JSR/npm publish steps; CLI tests updated (122 pass, including the resolver-free compile test).
- Synced README, AGENTS.md, docs (new `guide/agent-skills`), website Packages section, CLI guide/init output, boilerplate README/next-steps, and the contract tests.

## Task Commits

1. **Skills restructure** - `63486796` (`feat(skills)!`)
2. **CLI subcommand removal** - `01ed697f` (`feat(cli)!`)
3. **Docs + contract tests** - `e4d0cbad` (`docs(skills)`)
4. **Changeset** - `2d3556c9` (`chore`)

## Verification

- `npx skills add ./ --list` enumerates the eight skills; `npx skills add <repo> --skill napplet-make --skill napplet-ui -a claude-code -a codex -y` installs into `.agents/skills/` with `.claude/skills/` symlinks.
- `pnpm build`, `pnpm type-check`, `pnpm test` (check:jsr, release tooling, skills-contracts, all unit tests incl. Deno CLI, tutorial + conformance) green.
- `pnpm test:onboarding-contracts` green; `node --test scripts/test-convention-contracts.test.mjs` green (the scanner script itself already fails on `main` for `behavior: { newWindow:` in five docs pages — pre-existing, not in CI).
- aislop 0.12.0 scan: 75/100 (gate ≥70); remaining findings are pre-existing dependency advisories and `packages/cli/src/cli.ts` length.

## Follow-ups (out of scope)

- `github.com/napplet/boilerplate` still points at `npx @napplet/skills install --to codex` in `.codex/skills/README.md`, `AGENTS.md`, `README.md`, and `docs/context-map.md`, and its `tests/guidance.test.mjs` asserts that string plus demo-shaped expectations (`requires:` forbidden in `vite.config.ts`, starter control ids). The starter also ships the masthead/eyebrow/`h1` and the centered 1040px page layout that `napplet-ui` now tells agents to delete.
- `scripts/test-convention-contracts.mjs` flags NAP-INTENT `behavior: { newWindow }` examples across the docs; the pattern looks stale relative to the living spec.
