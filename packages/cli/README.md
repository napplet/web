# @napplet/cli

Standalone CLI for creating, configuring, building with agents, inspecting,
testing, and deploying napplets. The binary does not require Deno.

Use it to create a `.napplet/config.json`, find built `index.html` artifacts, inspect the deploy
plan, sign manifest events, upload files to Blossom servers, publish to relays, and run local
napplet tooling such as conformance and Paja.

## Install

### Standalone binary

```sh
# macOS or Linux
curl -fsSL https://raw.githubusercontent.com/napplet/web/main/scripts/install-napplet-cli.sh | sh
```

```powershell
# Windows PowerShell
irm https://raw.githubusercontent.com/napplet/web/main/scripts/install-napplet-cli.ps1 | iex
```

The installers select a supported release asset and verify it against
`SHA256SUMS` before replacing the executable. Supported assets are Linux x64 /
ARM64, macOS x64 / ARM64, and Windows x64.

### JSR/Deno alternative

```sh
deno install --global \
  --allow-read --allow-write --allow-run --allow-env --allow-net \
  --name napplet \
  jsr:@napplet/cli/cli
```

The permission set is intentionally explicit:

- `--allow-read` reads `.napplet/config.json`, built napplet files, and keychain command output.
- `--allow-write` writes `.napplet/config.json` and temporary deploy state.
- `--allow-run` calls system keychain helpers, conformance, and Paja wrapper commands.
- `--allow-env` reads signing and CI environment variables.
- `--allow-net` uploads to Blossom servers, publishes to relays, and connects to remote signers.

After installing, check the binary:

```sh
napplet --help
```

### From This Repository

For local development:

```sh
cd packages/cli
deno task dev --help
deno task dev init
deno task dev init --relay wss://relay.example --server https://blossom.example --name demo
```

To build standalone binaries from a checkout:

```sh
cd packages/cli
deno task build
./dist/napplet-linux-x86_64 --help
```

`deno task build` writes platform-specific binaries to `packages/cli/dist/`.

## Quick Start

The primary developer path is ordered and composable:

```sh
napplet create my-napplet
cd my-napplet
napplet init
napplet skills install --to codex
pnpm install
# Ask your agent to build the napplet.
pnpm verify
napplet deploy --dry-run
napplet deploy
```

What each step does:

- `napplet create` delegates to `@napplet/boilerplate` and creates the starter only.
- `napplet init` owns deployment name, title, description, archetype contracts, relays, and Blossom
  servers in `.napplet/config.json`; scripts can pass the same fields explicitly.
- `napplet skills` delegates to `@napplet/skills`, preserving every target and custom-location flag.
- `napplet debug` prints resolved config, discovered napplets, deploy targets, manifest templates,
  and signing readiness without uploading or publishing.
- `napplet deploy --dry-run` builds the same deploy plan and signed manifest events without network
  writes. Interactive terminals get a readable report with copyable NIP-19 pointers.
- `napplet deploy` uploads files to configured Blossom servers and publishes signed root, named, and
  optional snapshot manifest events to configured relays. Use `--json` for CI / machine output.

## Commands

```sh
napplet create <directory> [--template <path-or-url>] [--force]
napplet init [--force] [--root] [--source-dir <dir>] [--name <dtag>] [--title <title>] [--description <text>] [--archetype <slug:NAP-N>] [--relay <url>] [--server <url>]
napplet skills <list|print|install> [args]
napplet discover [--config <file>] [--all]
napplet debug [--config <file>] [--all] [--root] [--name <dtag>] [--snapshot] [--sec <secret>]
napplet deploy [--config <file>] [--all] [--root] [--name <dtag>] [--snapshot] [--sec <secret>] [--prompt-sec] [--dry-run] [--json]
napplet keys store --name <ref> [--sec <secret> | --prompt-sec]
napplet keys connect --name <ref> [--relay <url> ...] [--config <file>]
napplet keys use --name <ref> [--config <file>]
napplet keys list
napplet keys delete --name <ref>
napplet keys doctor
napplet conformance [--config <file>] [--all] [-- <args>]
napplet paja [--config <file>] [-- <args>]
```

### `init`

Creates `.napplet/config.json` unless it already exists. Use `--force` to overwrite it. For named
deployments, the NIP-5A d-tag must match `^[a-z0-9-]{1,13}$` and cannot end in `-`. Archetype values
use canonical `slug:NAP-N` contracts; there is no generic `type` manifest tag.

In an interactive terminal, `napplet init` guides setup for source directory, root-vs-named target,
name, title, optional description, archetype contracts, relays, and Blossom servers. Relay suggestions come from best-effort
[NIP-66](https://nips.nostr.com/66) discovery events on relay discovery relays such as
`wss://relaypag.es`; curated general-purpose relays are completed first, followed by live discoveries.
Blossom suggestions come from best-effort [NIP-B7](https://nips.nostr.com/b7) kind `10063`
server-list events, with bundled defaults when live discovery is unavailable. Suggestions are
advisory Tab-completion candidates; the written config contains only the values you accept or type.

```sh
napplet init
napplet init --source-dir . --name feed --title Feed --archetype note:NAP-4 --relay wss://relay.example --server https://blossom.example
napplet init --root --relay wss://relay.example --server https://blossom.example
```

Example config:

```json
{
  "version": 1,
  "sourceDir": ".",
  "relays": ["wss://relay.example"],
  "blossomServers": ["https://blossom.example"],
  "defaultTarget": "named",
  "named": ["feed"],
  "metadata": {
    "name": "feed",
    "title": "Feed",
    "description": "A focused feed reader",
    "archetypes": [{ "slug": "note", "protocol": "NAP-4" }]
  }
}
```

Valid config metadata takes precedence over title/description/archetype defaults found in built HTML
or the Vite plugin sidecar. Legacy configs without `metadata` retain their existing fallback behavior.

### `discover`

Prints JSON for napplets the CLI can deploy. Without `--all`, discovery checks the configured
`sourceDir`. With `--all`, it walks `discover.roots`.

```sh
napplet discover
napplet discover --all
```

### `debug`

Prints read-only JSON diagnostics for config, discovery, deploy planning, manifest templates, and
signing mode. Signing inputs are classified but secrets are not printed.

```sh
napplet debug --all
napplet debug --name feed --snapshot
```

### `deploy`

Creates deploy manifest templates, signs them when a signer is available, and optionally performs
the network deploy. Interactive terminals print a human report by default. Non-terminal output and
explicit `--json` print the full JSON report for CI.

```sh
napplet deploy
napplet deploy --dry-run --sec nsec1...
napplet deploy --name feed --snapshot --sec nsec1...
napplet deploy --all --sec nsec1...
napplet deploy --json --dry-run --sec nsec1...
```

Signing can come from:

- `--sec <hex-or-nsec-or-nbunksec-or-bunker://url>`
- `--prompt-sec`, which reads hidden terminal input until Enter and still accepts piped stdin in
  non-interactive runs. If the project config names a bunker pubkey/npub, the prompted signer must
  match that identity unless an interactive user explicitly confirms the mismatch.
- a stored key reference configured by `napplet keys use`
- a configured bunker pubkey/npub whose `nbunksec` session exists in native key storage
- an interactive NIP-46 connection flow when no signer is configured and `deploy` is running in a
  terminal
- `NAPPLET_CI_SIGNING_KEY` or `NAPPLET_CI_KEY_REFERENCE` when `.napplet` uses CI signing mode

The human deploy report includes each signed manifest event's short event id plus a copyable
`nevent` pointer. Addressable root and named manifests also include copyable `naddr` pointers using
the configured relay hints.

When a built napplet includes a plugin-generated `.nip5a-manifest.json`, deploy preserves canonical
`requires` tags from that sidecar on root, named, and companion snapshot manifests.

Deploy also reads the built `index.html` and emits single `title` and `description` manifest tags
from its plain HTML `<title>` and `<meta name="description">` values when present.

## Signing And Keys

Local key storage uses native platform secure storage: macOS Keychain, Windows Credential Manager,
or Linux Secret Service through `secret-tool` with a D-Bus session. If no native provider is
available, key commands fail closed rather than writing secrets to plaintext.

```sh
napplet keys doctor
napplet keys store --name default --sec nsec1...
napplet keys store --name default --prompt-sec
napplet keys use --name default
napplet keys list
napplet keys delete --name default
```

### Remote Signer Login

`napplet keys connect` runs a NIP-46 remote-signer login so you can pair a signer, such as a phone
app, without pasting a raw `nsec`.

```sh
napplet keys connect --name remote
napplet keys connect --name remote --relay wss://bucket.coracle.social
```

Unless `--relay` is passed, the command asks which bunker relay or relays to use before it prints the
QR code. Press Enter to use the default `wss://bucket.coracle.social`, or type one or more `ws://` /
`wss://` relays. These bunker relays are separate from `.napplet` deploy relays.

The command then prints a `nostrconnect://` QR code and waits for either:

- a signer to approve the QR flow, or
- a `bunker://` URL pasted into stdin

On success it stores an `nbunksec` in the platform keychain, updates `.napplet`
`signing.keyReference`, and uses that stored reference for later deploy signing.

Plain interactive `napplet deploy` uses the same NIP-46 flow when no signer flag or stored signer is
available. It prompts for bunker relays before showing the QR code; deploy relays from `.napplet`
are not used as the NIP-46 relay default. It stores the paired session under the remote signer pubkey
when native key storage is available, writes that pubkey and the selected bunker relays to `.napplet`
config, and continues the current deploy. If native key storage is unavailable, the current deploy
can still proceed after pairing, but the session is not persisted for later runs.

## Project Layouts

The CLI supports a single napplet repository and a workspace containing many napplets. The
difference is discovery only; deploy planning, signing, upload, and relay publishing use the same
path after candidates are found.

### Single Napplet Repository

The repository is one napplet. Discovery checks `sourceDir` and prefers `dist/index.html`, falling
back to a top-level `index.html`.

```text
my-napplet/
├── .napplet/config.json
├── dist/
│   └── index.html
└── src/
```

```sh
napplet init --name my-napplet
napplet debug
napplet deploy --dry-run --sec nsec1...
```

The named `d` tag comes from `--name` or `config.named`, falling back to `default` when unset. Use
`--root` to publish the singular replaceable root napplet, and `--snapshot` to also emit an
immutable snapshot companion.

### Workspace With Many Napplets

Set `discover.roots` to the directories to walk, then use `--all`. Each discovered napplet deploys
under its own folder name as the named `d` tag.

```text
my-workspace/
├── .napplet/config.json
└── packages/
    ├── feed/dist/index.html
    ├── wiki/dist/index.html
    └── settings/dist/index.html
```

```json
{
  "version": 1,
  "relays": ["wss://relay.example"],
  "blossomServers": ["https://blossom.example"],
  "defaultTarget": "named",
  "discover": { "enabled": true, "roots": ["packages"] }
}
```

```sh
napplet discover --all
napplet deploy --all --dry-run --sec nsec1...
napplet deploy --all --sec nsec1...
napplet deploy --all --name feed --sec nsec1...
```

Notes for workspace mode:

- `--name` and `config.named` filter discovered folder names.
- Folder names used as `d` tags must match `^[a-z0-9-]{1,13}$` and must not end in `-`.
- Discovery skips `.git`, `.napplet`, `.turbo`, `node_modules`, and `coverage`.
- `--root` is usually the wrong target for `--all` because the root site is singular per pubkey.

## Conformance And Paja

`napplet conformance` runs the configured conformance command for each discovered napplet:

```sh
napplet conformance
napplet conformance --all -- --verbose
```

The default command is `napplet-conformance`; override it in `.napplet/config.json` with
`conformance.command`.

`napplet paja` forwards to the configured Paja command:

```sh
napplet paja -- --port 5173
```

The default command is `kehto paja`; override it with `paja.command`.

## Troubleshooting

- Run `napplet debug` before `deploy`; it shows the candidates and manifest templates without
  publishing.
- Run `napplet keys doctor` if key commands fail; Linux needs `secret-tool` and an active D-Bus
  session.
- Use `--prompt-sec` when you need an ad-hoc key without echoing it in shell history; press Enter to
  submit the hidden prompt. If `.napplet` is configured for another pubkey, interactive deploys warn
  before continuing and non-interactive prompt input fails closed.
- Use `--json` when another program needs to parse `deploy` output.
- Use `--dry-run` before network deploys; it signs the same manifest events without uploading files
  or publishing to relays.
- If `discover --all` finds too much or too little, check `discover.roots` and the built
  `dist/index.html` paths.

## Development

```sh
cd packages/cli
deno task check
deno task test:unit
deno task build
```

Dependencies are declared in `deno.json` `imports`. The npm dependencies
(`applesauce-signers`, `nostr-tools`) are mirrored in `package.json`; JSR-only dependencies such
as `@libs/qrcode` and `@std/streams` live in `deno.json` only.
