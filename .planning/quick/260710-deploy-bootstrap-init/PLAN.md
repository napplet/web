# Deploy bootstrap init

## Problem

Nsyte can move a first-run user from `deploy` into interactive setup when the project config is
missing. `napplet deploy` currently stops with "Run: napplet init", which is a weak first-run
experience and makes a single-napplet repo feel like nothing happened.

## Target

- When `napplet deploy` is run interactively without `.napplet/config.json`, start the existing init
  wizard and then continue the deploy flow.
- Preserve CI behavior: `--json`, non-terminal input, and explicit `--config` should still fail
  instead of writing config implicitly.
- Reuse the same init report and suggestions path as `napplet init`.

## Verification

- Unit coverage for deploy bootstrapping config in interactive mode.
- Unit coverage that `--json`/non-interactive missing config still fails.
- CLI package check/test/lint plus root gates before pushing.
