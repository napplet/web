---
status: planned
---

# CLI: discover and deploy --all from a config-less root

`napplet discover` and `napplet deploy --all` throw "No .napplet config found" when run from a directory such as a monorepo root that holds `napplets/one` and `napplets/two`, each with its own `.napplet/config.yaml`. This is CLI tooling only; no protocol surface changes.

1. Add project discovery: walk from cwd (skipping the existing ignore list), treat a directory containing `.napplet/config.yaml` as a napplet project, stop descending there, and resolve its build candidates from that project's own config.
2. `discover`: when no config exists at cwd and no `--config` was given, print the discovered projects' candidates (with each project's config path) instead of throwing.
3. `deploy --all` with no root config: run the existing single-napplet deploy once per project, in that project's directory, using its own config. `--name` filters projects, `--config`/`--source-dir` are rejected, failures continue and return 1, and `--json` emits one array.
4. Bare interactive `deploy` with no config: ask "search for napplets recursively?" (default no). Yes runs step 3; no keeps the existing guided init. Non-interactive errors mention `--all`.
5. Tests, README/help, changeset, build/type-check/units/slop, commit, push, PR. `debug --all` and `conformance --all` are noted as follow-ups unless the reuse is trivial.
