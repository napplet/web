# @napplet/cli

Standalone CLI for creating, configuring, inspecting, testing, and deploying napplets. The binary does not require Deno, Node.js, or an npm package resolver for `napplet create`: it calls the bundled generator directly. Agent skills are installed with the open skills CLI (`npx skills add napplet/napplet`), not by this binary.

Use it to create a `.napplet/config.json`, find built `index.html` artifacts, inspect the deploy plan, sign manifest events, upload files to Blossom servers, publish to relays, and run local napplet tooling such as conformance and Paja.

## Install

### Standalone binary

```sh
# macOS or Linux
curl -fsSL https://napplet.run/install.sh | sh
```

```powershell
# Windows PowerShell
irm https://napplet.run/install.ps1 | iex
```

The installers download a supported asset from the [stable CLI release](https://github.com/napplet/napplet/releases/tag/napplet-cli) and verify it against `SHA256SUMS` before replacing the executable. Supported assets are Linux x64 / ARM64, macOS x64 / ARM64, and Windows x64.

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

After installing, open the developer guide or check the command reference:

```sh
napplet guide
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
npx skills add napplet/napplet
pnpm install
# Ask your agent to build the napplet.
pnpm verify
napplet deploy --dry-run
napplet deploy
```

What each step does:

- `napplet create` delegates to `@napplet/boilerplate` and creates the starter only.
- `napplet init` owns deployment name, title, description, archetype roles and conventions, relays, and Blossom servers in `.napplet/config.json`; scripts can pass the same fields explicitly.
- `npx skills add napplet/napplet` installs the `napplet-*` agent skills through the skills.sh CLI (Claude Code, Codex, Cursor, and 70+ other agents); it is not a `napplet` subcommand.
- `napplet debug` prints resolved config, discovered napplets, deploy targets, manifest templates, and signing readiness without uploading or publishing. Manifest template failures (for example a missing description, or built files a current deploy would drop) are reported in `manifests.error` instead of aborting, and `--format current|legacy` selects the event format inspected.
- `napplet deploy --dry-run` builds the same deploy plan and signed manifest events without network writes. Interactive terminals get a readable report with copyable NIP-19 pointers.
- `napplet deploy` uploads files to configured Blossom servers and publishes signed root, named, and optional snapshot manifest events to configured relays. Use `--json` for CI / machine output.

## Commands

```sh
napplet guide
napplet create <directory> [--template <path-or-url>] [--force]
napplet init [--force] [--root] [--source-dir <dir>] [--name <dtag>] [--title <title>] [--description <text>] [--archetype <slug:convention>] [--relay <url>] [--server <url>]
napplet discover [--config <file>] [--all]
napplet debug [--format current|legacy] [--config <file>] [--all] [--root] [--name <dtag>] [--snapshot] [--sec <secret>]
napplet deploy [--format current|legacy] [--config <file>] [--all] [--root] [--name <dtag>] [--snapshot] [--sec <secret>] [--prompt-sec] [--dry-run] [--json]
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

Creates `.napplet/config.json` unless it already exists. Use `--force` to overwrite it. For named deployments, the NIP-5A d-tag must match `^[a-z0-9-]+$` and cannot end in `-`. Each archetype value pairs a role slug with one convention, for example `note:napplet:note/open`; there is no generic `type` manifest tag.

The `--archetype` flag and interactive wizard intentionally remain `slug:convention` input only; there is no CLI kinds flag or delimiter. Optional event-kind discovery metadata belongs in the object-shaped config entry, not in the convention URI.

In an interactive terminal, `napplet init` guides setup for source directory, root-vs-named target, name, title, optional description, archetype roles and conventions, relays, and Blossom servers. Relay suggestions come from best-effort [NIP-66](https://nips.nostr.com/66) discovery events on relay discovery relays such as `wss://relaypag.es`; curated general-purpose relays are completed first, followed by live discoveries. Blossom suggestions come from best-effort [NIP-B7](https://nips.nostr.com/b7) kind `10063` server-list events, with bundled defaults when live discovery is unavailable. Suggestions are advisory Tab-completion candidates; the written config contains only the values you accept or type.

```sh
napplet init
napplet init --source-dir . --name feed --title Feed --archetype note:napplet:note/open --relay wss://relay.example --server https://blossom.example
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
    "archetypes": [{
      "slug": "note",
      "convention": "napplet:note/open"
    }]
  }
}
```

Valid config metadata takes precedence over title/description/archetype defaults found in built HTML or the Vite plugin sidecar. Legacy configs without `metadata` retain their existing fallback behavior. Each object emits independent current tags: `["z", "note"]` and `["i", "napplet:note/open"]`; optional `params` lists advertised parameter names. The role slug and convention's own archetype segment are independent under [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md). A metadata-free template keeps its canonical archetype tags; providing `metadata.archetypes` replaces those tags with the configured objects. A domain listed as both required and optional is emitted only as `O`, matching the Vite plugin.

The convention string remains queryless after validation: it does not select a payload schema, query rule, matching rule, or inferred event kind. This non-normative guide follows the adopted [NAP-INC #89 `4593ce9`](https://github.com/napplet/naps/blob/4593ce9e301ce098fd3dad64206fcd6f144fa7af/naps/NAP-INC.md), [URI terminology #90 `896c32c`](https://github.com/napplet/naps/commit/896c32c92deee68dc4d10fc1132b62df20cccb6f), and [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md).

### `discover`

Prints JSON for napplets the CLI can deploy. Without `--all`, discovery checks the configured `sourceDir`. With `--all`, it walks `discover.roots`.

```sh
napplet discover
napplet discover --all
```

### `debug`

Prints read-only JSON diagnostics for config, discovery, deploy planning, manifest templates, and signing mode. Signing inputs are classified but secrets are not printed.

```sh
napplet debug --all
napplet debug --name feed --snapshot
```

### `deploy`

Creates deploy manifest templates, signs them when a signer is available, and optionally performs the network deploy. Interactive terminals print a human report by default. Non-terminal output and explicit `--json` print the full JSON report for CI.

```sh
napplet deploy
napplet deploy --dry-run --sec nsec1...
napplet deploy --name feed --snapshot --sec nsec1...
napplet deploy --all --sec nsec1...
napplet deploy --json --dry-run --sec nsec1...
```

Signing can come from:

- `--sec <hex-or-nsec-or-nbunksec-or-bunker://url>`
- `--prompt-sec`, which reads hidden terminal input until Enter and still accepts piped stdin in non-interactive runs. If the project config names a bunker pubkey/npub, the prompted signer must match that identity unless an interactive user explicitly confirms the mismatch.
- a stored key reference configured by `napplet keys use`
- a configured bunker pubkey/npub whose `nbunksec` session exists in native key storage
- an interactive NIP-46 connection flow when no signer is configured and `deploy` is running in a terminal
- `NAPPLET_CI_SIGNING_KEY` or `NAPPLET_CI_KEY_REFERENCE` when `.napplet` uses CI signing mode

The human deploy report includes each signed manifest event's short event id plus a copyable `nevent` pointer. Addressable root and named manifests also include copyable `naddr` pointers using the configured relay hints.

When a built napplet includes a plugin-generated `.nip5a-manifest.json`, signed or unsigned, deploy preserves capability and intent metadata from that sidecar, translating legacy `requires`/`archetype` to current `R` and `z`/`i` tags on root, named, and companion snapshot manifests.

Deploy also recovers current NIP-5D publishing metadata from the built HTML head, including supported data-URL icon bytes, without a sidecar. Current output requires a non-empty description. See Standalone HTML recovery below for precedence and target handling.

## Signing And Keys

Local key storage uses native platform secure storage: macOS Keychain, Windows Credential Manager, or Linux Secret Service through `secret-tool` with a D-Bus session. If no native provider is available, key commands fail closed rather than writing secrets to plaintext.

```sh
napplet keys doctor
napplet keys store --name default --sec nsec1...
napplet keys store --name default --prompt-sec
napplet keys use --name default
napplet keys list
napplet keys delete --name default
```

### Remote Signer Login

`napplet keys connect` runs a NIP-46 remote-signer login so you can pair a signer, such as a phone app, without pasting a raw `nsec`.

```sh
napplet keys connect --name remote
napplet keys connect --name remote --relay wss://bucket.coracle.social
```

Unless `--relay` is passed, the command asks which bunker relay or relays to use before it prints the QR code. Press Enter to use the default `wss://bucket.coracle.social`, or type one or more `ws://` / `wss://` relays. These bunker relays are separate from `.napplet` deploy relays.

The command then prints a `nostrconnect://` QR code and waits for either:

- a signer to approve the QR flow, or
- a `bunker://` URL pasted into stdin

On success it stores an `nbunksec` in the platform keychain, updates `.napplet` `signing.keyReference`, and uses that stored reference for later deploy signing.

Plain interactive `napplet deploy` uses the same NIP-46 flow when no signer flag or stored signer is available. It prompts for bunker relays before showing the QR code; deploy relays from `.napplet` are not used as the NIP-46 relay default. It stores the paired session under the remote signer pubkey when native key storage is available, writes that pubkey and the selected bunker relays to `.napplet` config, and continues the current deploy. If native key storage is unavailable, the current deploy can still proceed after pairing, but the session is not persisted for later runs.

## Project Layouts

The CLI supports a single napplet repository and a workspace containing many napplets. The difference is discovery only; deploy planning, signing, upload, and relay publishing use the same path after candidates are found.

### Single Napplet Repository

The repository is one napplet. Discovery checks `sourceDir` and prefers `dist/index.html`, falling back to a top-level `index.html`.

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

The named `d` tag comes from `--name` or `config.named`, falling back to `default` when unset. Use `--root` to publish the singular replaceable root napplet, and `--snapshot` to also emit an immutable snapshot companion.

### Workspace With Many Napplets

Set `discover.roots` to the directories to walk, then use `--all`. Each discovered napplet deploys under its own folder name as the named `d` tag.

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
- Folder names used as `d` tags must match `^[a-z0-9-]+$` and must not end in `-`.
- Discovery skips `.git`, `.napplet`, `.turbo`, `node_modules`, and `coverage`.
- `--root` is usually the wrong target for `--all` because the root site is singular per pubkey.

## Conformance And Paja

`napplet conformance` runs the configured conformance command for each discovered napplet:

```sh
napplet conformance
napplet conformance --all -- --verbose
```

The default `napplet-conformance` setting runs `@napplet/conformance-cli` through `npx`, so the standalone `napplet` binary does not require a global conformance executable. Override it in `.napplet/config.json` with `conformance.command` when using another runner.

`napplet paja` forwards to the configured Paja command:

```sh
napplet paja -- --port 5173
napplet paja -- pnpm vite --host 127.0.0.1
```

The default command is `kehto paja`; override it with `paja.command`. A bare command after the separator is passed to Kehto as its managed app server command.

## Troubleshooting

- Run `napplet debug` before `deploy`; it shows the candidates and manifest templates without publishing.
- Run `napplet keys doctor` if key commands fail; Linux needs `secret-tool` and an active D-Bus session.
- Use `--prompt-sec` when you need an ad-hoc key without echoing it in shell history; press Enter to submit the hidden prompt. If `.napplet` is configured for another pubkey, interactive deploys warn before continuing and non-interactive prompt input fails closed.
- Use `--json` when another program needs to parse `deploy` output.
- Use `--dry-run` before network deploys; it signs the same manifest events without uploading files or publishing to relays.
- If `discover --all` finds too much or too little, check `discover.roots` and the built `dist/index.html` paths.

## Development

```sh
cd packages/cli
deno task check
deno task test:unit
deno task build
```

Dependencies are declared in `deno.json` `imports`. The npm dependencies (`applesauce-signers`, `nostr-tools`) are mirrored in `package.json`; JSR-only dependencies such as `@libs/qrcode` and `@std/streams` live in `deno.json` only.


## Current and legacy event formats

From CLI **0.7.0**, deployments default to the current NIP-5D artifact-hash schema. Interactive deploys ask for `current` or `legacy`; scripts can choose with `--format current|legacy`. A non-empty description is required for current event content. Legacy output remains isolated in a temporary serializer; 0.6.x and earlier defaulted to legacy events. Current deploys upload only `/index.html` plus the blob referenced by an `icon` tag; any other built file in the deploy directory makes deploy fail with the list of those files (build a single-file artifact or use `--format legacy`).

```sh
napplet deploy --dry-run --format current
napplet deploy --format legacy
napplet migrate signed-event.json --optional theme --output migration-preview.json
```

`migrate` verifies the source signature and writes an unsigned preview with provenance. It does not publish or modify the artifact, and refuses to overwrite an existing output file. Review description, required/optional choices and pointers before signing. See the [migration guide](https://napplet.run/docs/guide/event-migration) for format differences and shell data/consent implications.

### Removing temporary legacy output

Legacy serialization lives in `src/manifest-legacy.ts`; `manifest-format.ts` owns the format choice. When retiring legacy deployment, remove that serializer, the selection prompt/flag, and the `format === "legacy"` branches in manifest construction and metadata conversion. Keep signed legacy input conversion in `migrate.ts` if old-event migration remains supported. Current-schema conformance readers have no fallback to remove.

## Standalone HTML recovery

The CLI reads the head mappings from [NIP-5D, HTML Metadata for Publishing](https://github.com/nostr-protocol/nips/pull/2303), including title, description, named identifier, roles, intents with advertised parameters, required/optional domains, source, server hints, and supported PNG/JPEG/WebP data-URL icons. This is non-normative implementation guidance; the living specification remains authoritative. Embedded metadata is optional, remains untrusted publishing input, and does not replace signed manifest verification at runtime.

For current-format deployment, explicit config metadata overrides matching sidecar categories, which override matching head categories. Missing categories fall back to HTML. Explicit target/name selection and configured names override `napplet-id`; a single-project named deploy without a configured name uses the sidecar identifier, then the head identifier, before the existing `default` fallback. Monorepo traversal retains folder-based naming and filtering. Configured Blossom servers override embedded hints; when none are configured, recovered server hints supply upload destinations. The CLI validates selected destinations before manifest signing or upload: each must be a non-empty HTTP(S) origin without credentials, a path, a query, or a fragment; a trailing slash is accepted. Invalid destinations produce an error identifying their config or manifest-hint position. Relay and signing configuration are still needed for publication.

Root and named events omit lineage tags. Companion snapshots retain the CLI's selected source address as their parent; head provenance does not replace that explicit selection. Root/snapshot events omit the named identifier. Deployment does not rewrite the HTML when config or selection overrides its hints: it hashes and uploads the original bytes and signs the resolved metadata separately.

Decoded icon bytes are hashed and uploaded unchanged alongside the HTML, even when `index.html` is the only file in the deployment directory. No extracted icon file is written. If a sidecar overrides the icon, embedded bytes are used only when both hash and MIME type match that declaration. Remote, unsupported, empty, malformed, and MIME-mismatched icon URLs are ignored. Hash-only sidecars still require the matching blob to be supplied separately. Consumers verify decoding before display according to NIP-5D. Legacy-format deployment retains its previous title/description HTML fallback behavior.
