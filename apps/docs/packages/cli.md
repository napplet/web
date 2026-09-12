# @napplet/cli

> Standalone CLI for creating, configuring, inspecting, and deploying napplets.

`@napplet/cli` is the command-line deploy and diagnostics tool for built
napplets. It creates `.napplet/config.json`, discovers built `index.html`
artifacts, inspects deploy plans, signs manifest events, uploads files to
Blossom servers, publishes to relays, and runs local napplet tooling such as
conformance and Paja.

The standalone binary runs `napplet create` through bundled package code, so scaffolding does not need Node.js or an npm package resolver at runtime. Agent skills are installed separately with the open skills CLI — see [Agent skills](/guide/agent-skills).

- **npm:** [`@napplet/cli`](https://www.npmjs.com/package/@napplet/cli)
- **JSR:** [`@napplet/cli`](https://jsr.io/@napplet/cli)
- **Source:** [packages/cli](https://github.com/napplet/napplet/tree/main/packages/cli)

## Install

Install a checksum-verified standalone binary without Deno:

```bash
# macOS or Linux
curl -fsSL https://napplet.run/install.sh | sh
```

```powershell
# Windows PowerShell
irm https://napplet.run/install.ps1 | iex
```

The installers verify the downloaded asset against the release's
`SHA256SUMS`. Linux and macOS support x64 and ARM64; Windows supports x64.

### JSR/Deno alternative

```bash
deno install --global \
  --allow-read --allow-write --allow-run --allow-env --allow-net \
  --name napplet \
  jsr:@napplet/cli/cli
```

Then open the developer guide or check the command reference:

```bash
napplet guide
napplet --help
```

The permission set is explicit because deploys need to read build output and
config, write temporary deploy state, run local helper commands, read signing
environment variables, upload to Blossom servers, publish to relays, and connect
to remote signers.

## Quick start

Run the same path for every new project:

```bash
napplet create my-napplet
cd my-napplet
napplet init
npx skills add napplet/napplet
pnpm install
# Ask your agent to build the napplet.
pnpm verify
napplet deploy --dry-run
napplet deploy
```

- `napplet create` delegates to the maintained starter generator without setting deploy metadata.
- `napplet init` owns name, title, optional description, canonical archetype conventions, and network
  targets in `.napplet/config.json`. In an interactive terminal it guides setup and shows live suggestions from
  relays such as `wss://relaypag.es`, and suggests Blossom servers from kind
  `10063` server-list events.
- `npx skills add napplet/napplet` installs the `napplet-*` agent skills for whichever coding agents you use; it is the skills.sh CLI, not a `napplet` subcommand.
- `napplet debug` prints resolved config, discovered napplets, deploy targets,
  manifest templates, and signing readiness without network writes.
- `napplet deploy --dry-run` builds the same deploy plan and signed manifest
  events without uploading or publishing.
- `napplet deploy` uploads files to configured Blossom servers and publishes
  signed root, named, and optional snapshot manifest events to configured relays.
- When no signer flag or stored signer exists, interactive `napplet deploy`
  starts the NIP-46 connection flow and stores the paired remote signer when
  native key storage is available.
- `--prompt-sec` reads hidden input until Enter; when `.napplet` names a bunker pubkey/npub, a
  mismatched prompted signer requires interactive confirmation and fails closed in non-interactive
  runs.

## Commands

```bash
napplet guide
napplet create <directory> [--template <path-or-url>] [--force]
napplet init [--force] [--root] [--source-dir <dir>] [--name <dtag>] [--title <title>] [--description <text>] [--archetype <slug:napplet:archetype/intent>] [--relay <url>] [--server <url>]
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

## Archetype conventions

Pass each `--archetype` option as `slug:napplet:<archetype>/<intent>`, for
example `profile:napplet:profile/open`. The resulting configuration preserves
the queryless convention:

```json
{
  "metadata": {
    "archetypes": [
      {
        "slug": "profile",
        "convention": "napplet:profile/open"
      }
    ]
  }
}
```

```json
["archetype", "profile", "napplet:profile/open"]
```

Each tag advertises one stable convention identity. The role slug and convention's own archetype segment are independent under [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md). Query parameters are rejected in metadata.

`--archetype` and the interactive wizard remain convention-only. Use object-form `.napplet/config.json` metadata
when event-kind discovery is needed. URI query transposition occurs only in the
runtime bindings for INC emission and intent invocation, never in manifest
discovery or handler matching.

This shape follows [NAP-INC PR #89
(`4593ce9`)](https://github.com/napplet/naps/pull/89/commits/4593ce9e301ce098fd3dad64206fcd6f144fa7af),
[the web projection PR #90
(`896c32c`)](https://github.com/napplet/naps/pull/90/commits/896c32c92deee68dc4d10fc1132b62df20cccb6f),
and [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md)
at those exact draft heads.

## See also

- [`@napplet/vite-plugin`](./vite-plugin) — emits build-side manifest metadata
  the CLI preserves during deploy.
- [`@napplet/conformance-cli`](./conformance-cli) — the default command behind
  `napplet conformance`; the standalone CLI resolves it through `npx`, without requiring a global
  `napplet-conformance` executable.
- [Getting started](/guide/getting-started) — scaffold, build, and verify a
  napplet before deploying.
