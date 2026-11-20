---
status: complete
---

# CLI: discover and deploy --all from a config-less root

`napplet discover` and `napplet deploy --all` now work from a directory without a `.napplet` config. Both search subdirectories for napplet projects (each directory with its own `.napplet/config.yaml`, not descending further) and resolve builds from each project's own config. `deploy --all` runs the normal single-napplet deploy once per project, inside that project's directory. `--name` filters projects by folder name or relative path; `--config`/`--source-dir` are rejected; the event format is asked once; failures continue and exit 1; `--json` prints one array. A bare interactive `deploy` asks whether to search (default no); no keeps the guided init.

Verified: `pnpm build`, `pnpm type-check`, `pnpm -r test:unit` green (CLI 275 passed); 10 new unit tests; end-to-end in a scratch `napplets/napplet1`, `napplets/napplet2` tree with a stray root `index.html` — discover, `deploy --all --dry-run --json`, `--name`, and both prompt answers through a real PTY. AI-slop 93/100: only three root dependency advisories unrelated to this change.

Known gaps: without `--sec`, each project resolves its own signer, so an interactive run can prompt per napplet. `debug --all` and `conformance --all` still require a config at cwd.
