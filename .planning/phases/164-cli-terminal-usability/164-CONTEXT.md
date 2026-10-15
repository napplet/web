# Phase 164: CLI terminal usability

Gathered: 2026-10-15. Source: active user goal and flag clarification. Status: ready for execution.

## User requirements

1. Missing configuration values trigger guided prompts in interactive terminals instead of aborting the workflow.
2. Improve terminal layout, colors, progress, deployment summaries, and general usability.
3. Study nsyte's real workflows, color use, deployment display, and progress bars.
4. The user explicitly confirmed that `-i` disables prompts. Provide `-i` / `--non-interactive` on every command that can prompt. CI, redirected input, and JSON remain prompt-free.
5. Show an ASCII napplet banner at startup for human terminal sessions.
6. Completion requires an open PR containing visual proof from actual CLI execution.

## Decisions

Keep existing JSON outputs parseable, version output stable, and protocol validation intact. Missing values can be recovered; invalid explicit values must remain actionable errors. Prompt only for relevant missing settings and preserve existing configuration and secrets. Confirm persistence of prompted deployment settings. Never save plaintext signing keys to project configuration. Do not fabricate deployment progress or public network results for screenshots. Use local mock endpoints for reproducible deployment proof and label them clearly.

Use a small shared terminal policy and formatting layer with no new runtime dependency. Honor NO_COLOR, TERM=dumb, narrow terminals, Ctrl-C, EOF, and redirected streams. Gate key-store password prompts and delegated workflows as well as command-level prompts.

## Canonical references

- `AGENTS.md`: protocol fidelity, worktree isolation, verification and shipping requirements.
- `packages/cli/src/cli.ts`, `flags.ts`, `prompt.ts`, `output.ts`: current command and terminal boundaries.
- `packages/cli/src/config.ts`, `init-wizard.ts`, `deploy-signer.ts`, `keys-command.ts`, `portable-key-store.ts`: config and credential workflows.
- https://github.com/sandwichfarm/nsyte: reference UX, particularly `src/commands/deploy.ts`, `src/ui/progress.ts`, `src/ui/output-helpers.ts`, `src/ui/header.ts`.
- https://github.com/nostr-protocol/nips/pull/2303 and https://github.com/napplet/naps: living protocol sources if any protocol question arises. This phase changes presentation and local input handling, not protocol requirements.

## Workspace

Base: origin/main efc64764. Branch: feat/cli-terminal-usability. Worktree: /Users/sandwich/Develop/napplet-cli-usability. Original workspace contains unrelated changes and remains untouched. GSD roles run inline under the Codex skill adapter's spawn restriction.
