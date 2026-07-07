# @napplet/cli

> Deno CLI for discovering, inspecting, testing, and deploying built napplets.

`@napplet/cli` is the command-line deploy and diagnostics tool for built
napplets. It creates `.napplet/config.json`, discovers built `index.html`
artifacts, inspects deploy plans, signs manifest events, uploads files to
Blossom servers, publishes to relays, and runs local napplet tooling such as
conformance and Paja.

- **npm:** [`@napplet/cli`](https://www.npmjs.com/package/@napplet/cli)
- **JSR:** [`@napplet/cli`](https://jsr.io/@napplet/cli)
- **Source:** [packages/cli](https://github.com/napplet/napplet/tree/main/packages/cli)

## Install

Install the runnable CLI from JSR:

```bash
deno install --global \
  --allow-read --allow-write --allow-run --allow-env --allow-net \
  --name napplet \
  jsr:@napplet/cli/cli
```

Then check the binary:

```bash
napplet --help
```

The permission set is explicit because deploys need to read build output and
config, write temporary deploy state, run local helper commands, read signing
environment variables, upload to Blossom servers, publish to relays, and connect
to remote signers.

## Quick start

Run these commands from a repository or workspace that contains a built napplet:

```bash
napplet init \
  --relay wss://relay.example \
  --server https://blossom.example \
  --name my-napplet

napplet debug
napplet deploy --dry-run --sec nsec1...
napplet deploy --sec nsec1...
```

- `napplet init` creates `.napplet/config.json`.
- `napplet debug` prints resolved config, discovered napplets, deploy targets,
  manifest templates, and signing readiness without network writes.
- `napplet deploy --dry-run` builds the same deploy plan and signed manifest
  events without uploading or publishing.
- `napplet deploy` uploads files to configured Blossom servers and publishes
  signed root, named, and optional snapshot manifest events to configured relays.

## Commands

```bash
napplet init [--force] [--source-dir <dir>] [--relay <url>] [--server <url>] [--name <dtag>]
napplet discover [--config <file>] [--all]
napplet debug [--config <file>] [--all] [--root] [--name <dtag>] [--snapshot] [--sec <secret>]
napplet deploy [--config <file>] [--all] [--root] [--name <dtag>] [--snapshot] [--sec <secret>] [--prompt-sec] [--dry-run]
napplet keys store --name <ref> [--sec <secret> | --prompt-sec]
napplet keys connect --name <ref> [--relay <url> ...] [--config <file>]
napplet keys use --name <ref> [--config <file>]
napplet keys list
napplet keys delete --name <ref>
napplet keys doctor
napplet conformance [--config <file>] [--all] [-- <args>]
napplet paja [--config <file>] [-- <args>]
```

## Layouts

For a single napplet repository, discovery checks `sourceDir` and prefers
`dist/index.html`, falling back to a top-level `index.html`.

For workspaces, set `discover.roots` and use `--all`. Each discovered napplet
deploys under its own folder name as the named `d` tag.

## See also

- [`@napplet/vite-plugin`](./vite-plugin) — emits build-side manifest metadata
  the CLI preserves during deploy.
- [`@napplet/conformance-cli`](./conformance-cli) — the default command behind
  `napplet conformance`.
- [Getting started](/guide/getting-started) — scaffold, build, and verify a
  napplet before deploying.
