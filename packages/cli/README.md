# @napplet/cli

Standalone CLI for creating, configuring, inspecting, testing, and deploying napplets. The standalone binary runs every built-in command without separately installed Node.js, npm, npx, Deno, Git, Kehto, or browser tooling. Screenshot, conformance, and Paja commands download a private, checksum-verified Node runtime and maintained packages on first use; browser commands also provision Chromium. Linux captures include the browser libraries and fonts. Downloads live in the CLI cache and never install into your project or global PATH.

First use of these tools requires network access and a writable cache. Later invocations reuse the downloads. The default cache is `~/Library/Caches/napplet` on macOS, `$XDG_CACHE_HOME/napplet` (or `~/.cache/napplet`) on Linux, and `%LOCALAPPDATA%\napplet` on Windows. Set `NAPPLET_CACHE_DIR` to choose another location; copying a populated cache between machines with the same OS and architecture supports offline tooling. User-configured `conformance.command`, `paja.command`, and app-server commands passed to Paja use the software you explicitly select.

The generated Vite project and the optional skills.sh CLI have their own development dependencies; they are separate from running `napplet` commands.

Use it to create a `.napplet/config.yaml`, find built `index.html` artifacts, inspect the deploy plan, sign manifest events, upload files to Blossom servers, publish to relays, and run local napplet tooling such as conformance and Paja.

*Building a game?*

[`soyli`](https://napplet.soy) cli may be better suited for the task; with features optimized for game napplets such as scoreboards and both local and online multiplayer agent guidance.  

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

### Check the installed version

```sh
napplet --version
# Also available: napplet -v or napplet version
```

This prints the version of the CLI you actually invoked. If you have both standalone and Deno installations, use `type -a napplet` on macOS/Linux or `Get-Command napplet -All` in PowerShell to check which executable takes precedence. A version command reported as unknown means that installation predates version reporting.

### JSR/Deno alternative

```sh
deno install --global \
  --allow-read --allow-write --allow-run --allow-env --allow-net \
  --name napplet \
  jsr:@napplet/cli/cli
```

To refresh an existing JSR installation, rerun the command with `--force --reload` after `--global`. Then check the Deno-installed executable directly (`~/.deno/bin/napplet --version` with Deno's default install location); another `napplet` earlier on `PATH` is unaffected. See [Deno's install reference](https://docs.deno.com/runtime/reference/cli/install/) for custom install locations and upgrade flags.


The permission set is intentionally explicit:

- `--allow-read` reads `.napplet/config.yaml`, built napplet files, and keychain command output.
- `--allow-write` writes `.napplet/config.yaml` and temporary deploy state.
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
- `napplet init` owns deployment name, title, description, archetype roles and conventions, relays, and Blossom servers in `.napplet/config.yaml`; scripts can pass the same fields explicitly.
- `npx skills add napplet/napplet` installs the `napplet-*` agent skills through the skills.sh CLI (Claude Code, Codex, Cursor, and 70+ other agents); it is not a `napplet` subcommand.
- `napplet debug` prints resolved config, discovered napplets, deploy targets, manifest templates, and signing readiness without uploading or publishing. Manifest template failures (for example a missing description, or built files a current deploy would drop) are reported in `manifests.error` instead of aborting, and `--format current|legacy` selects the event format inspected.
- `napplet deploy --dry-run` builds the same deploy plan and signed manifest events without network writes. Interactive terminals get a readable report with copyable NIP-19 pointers.
- `napplet deploy` uploads files to configured Blossom servers and publishes signed root, named, and optional snapshot manifest events to configured relays. Use `--json` for CI / machine output.

## Terminal workflow

The CLI opens human terminal sessions with an ASCII napplet banner, grouped command help, colored results, and filled upload/publish progress bars (`█` completed, `░` remaining). Use `napplet <command> --help` for command-specific options. `NO_COLOR=1` or `--no-color` removes colors; redirected deploy output remains JSON, and `--version` remains one line.

Interactive deployment completes missing build paths, descriptions, publishing names, relays, Blossom destinations, and application metadata before signing. Existing settings and embedded metadata are retained. Prompted deployment settings can be saved for the next run. A missing signer opens a choice of remote connection, an existing stored reference, or hidden secret entry. Ctrl-C or EOF cancels cleanly.

Every command accepts `-i` / `--non-interactive` to disable prompts, including nested key-store password prompts. CI and redirected streams also disable prompts. Missing required inputs then produce actionable configuration guidance instead of waiting on stdin. `--prompt-sec` still supports explicitly piped secret input; it does not open a terminal prompt with `-i`. `keys connect` requires interactive remote approval, so automation should use an existing session. For encrypted local storage, provide `NAPPLET_KEYSTORE_PASSWORD` through your CI secret store.

```sh
napplet deploy -i --format current --json
napplet deploy -i --dry-run --description "My napplet" --json
napplet init -i --name notes --description "Private notes" --relay wss://relay.example --server https://blossom.example
```

Deploy accepts `--source-dir`, `--description`, repeated `--relay`, and repeated `--server` as per-invocation overrides. It shows the selected targets before network work. Final results distinguish complete deployments, partial redundancy warnings, and failures, and retain copyable event references. Re-running `napplet init` interactively fills gaps in the existing configuration; `--force` explicitly replaces it.

## Commands

```sh
napplet guide
napplet create <directory> [--template <path-or-url>] [--force]
napplet init [--force] [--root] [--source-dir <dir>] [--name <dtag>] [--title <title>] [--description <text>] [--archetype <napplet:archetype/intent>] [--relay <url>] [--server <url>]
napplet discover [--config <file>] [--all]
napplet debug [--format current|legacy] [--config <file>] [--all] [--root] [--name <dtag>] [--snapshot] [--sec <secret>]
napplet deploy [--format current|legacy] [--config <file>] [--all] [--root] [--name <dtag>] [--snapshot] [--sec <secret>] [--prompt-sec] [--zapstore | --no-zapstore] [--no-screenshot] [--screenshot [<preview-url>]] [--dry-run] [--json]
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

Creates `.napplet/config.yaml` unless it already exists. Use `--force` to overwrite it. For named deployments, the NIP-5D d-tag must match `^[a-z0-9-]+$` and cannot end in `-`. Pass a queryless convention URI such as `napplet:note/open`; the CLI derives the role `note` from the URI.

The `--archetype` flag and interactive wizard accept convention URIs directly. YAML `metadata.archetypes` entries also accept URI strings, such as `["napplet:note/open"]`, and normalize them to the object form below. Existing object configs and older role-prefixed CLI inputs remain supported. Use object entries with `params` to advertise parameter names; these are not event-kind restrictions.

In an interactive terminal, `napplet init` guides setup for source directory, root-vs-named target, name, title, optional description, archetype roles and conventions, relays, and Blossom servers. Relay suggestions come from best-effort [NIP-66](https://nips.nostr.com/66) discovery events on relay discovery relays such as `wss://relaypag.es`; curated general-purpose relays are completed first, followed by live discoveries. Blossom suggestions come from best-effort [NIP-B7](https://nips.nostr.com/b7) kind `10063` server-list events, with bundled defaults when live discovery is unavailable. Suggestions are advisory Tab-completion candidates; the written config contains only the values you accept or type.

```sh
napplet init
napplet init --source-dir . --name feed --title Feed --archetype napplet:note/open --relay wss://relay.example --server https://blossom.example
napplet init --root --relay wss://relay.example --server https://blossom.example
```

Example config:

```yaml
version: 1
sourceDir: .
relays:
  - wss://relay.example
blossomServers:
  - https://blossom.example
defaultTarget: named
named:
  - feed
metadata:
  name: feed
  title: Feed
  description: A focused feed reader
  archetypes:
    - slug: note
      convention: napplet:note/open
```

Valid config metadata takes precedence over title/description/archetype defaults found in built HTML or the Vite plugin sidecar. Legacy configs without `metadata` retain their existing fallback behavior. Each object emits independent current tags: `["z", "note"]` and `["i", "napplet:note/open"]`; optional `params` lists advertised parameter names. Under [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md#manifest-catalog-contract), a convention is eligible for dispatch only when its archetype segment matches a `z` role on the same manifest. A metadata-free template keeps its canonical archetype tags; providing `metadata.archetypes` replaces those tags with the configured objects. A domain listed as both required and optional is emitted only as `O`, matching the Vite plugin.

This non-normative guide defers to the living [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md) specification. Manifest convention identities are queryless and fragment-free; parameter values belong to invocation payloads.

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
- an interactive signer choice when no signer is configured and `deploy` is running in a terminal
- `NAPPLET_CI_SIGNING_KEY` or `NAPPLET_CI_KEY_REFERENCE` when `.napplet` uses CI signing mode

The human deploy report includes each signed manifest event's short event id plus a copyable `nevent` pointer. Addressable root and named manifests also include copyable `naddr` pointers using the configured relay hints.

When a built napplet includes a `.nip5a-manifest.json` sidecar, signed or unsigned, deploy preserves additional Nostr tags on root, named, and companion snapshot manifests, including their complete string payloads and repeated values. There is no tag-name allowlist. Explicit config overrides and CLI-managed artifact hashes, identifiers, lineage, server selection, and client attribution still apply. Legacy sidecars translate `requires`/`archetype` to current `R` and `z`/`i`; those names, along with `path` and `description`, remain opaque extra tags when supplied by a current-format event. Current event content is resolved separately from extra `description` tags. Migration likewise preserves additional tags and their multiplicity while converting actual legacy fields.

Deploy also recovers current NIP-5D publishing metadata from the built HTML head, including supported data-URL icon bytes, without a sidecar. Current output requires a non-empty description. See Standalone HTML recovery below for precedence and target handling.

## Signing And Keys

Local key storage prefers native platform secure storage: macOS Keychain, Windows Credential Manager, or Linux Secret Service when available. Hosts without those utilities use password-encrypted files in `~/.napplet/keys`. The portable store uses AES-256-GCM with a fresh salt and IV per record and PBKDF2-SHA256 (600,000 iterations). Secrets are never written as plaintext. Unlock it with a password of at least 12 characters at the hidden terminal prompt, or set `NAPPLET_KEYSTORE_PASSWORD` for non-interactive use. Set `NAPPLET_KEYSTORE=portable` to select it explicitly and `NAPPLET_KEYSTORE_DIR` to change its location. Keep the same password for later retrieval; it is not saved by the CLI.

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

On success it stores an `nbunksec` in the selected key store, updates `.napplet` `signing.keyReference`, and uses that stored reference for later deploy signing.

Plain interactive `napplet deploy` offers the same NIP-46 flow alongside stored-key and hidden-secret choices when no signer is configured. It prompts for bunker relays before showing the QR code; deploy relays from `.napplet` are not used as the NIP-46 relay default. It stores the paired session under the remote signer pubkey when native key storage is available, writes that pubkey and the selected bunker relays to `.napplet` config, and continues the current deploy. If native key storage is unavailable, the current deploy can still proceed after pairing, but the session is not persisted for later runs.

## Project Layouts

The CLI supports a single napplet repository and a workspace containing many napplets. The difference is discovery only; deploy planning, signing, upload, and relay publishing use the same path after candidates are found.

### Single Napplet Repository

The repository is one napplet. Discovery checks `sourceDir` and prefers `dist/index.html`, falling back to a top-level `index.html`.

```text
my-napplet/
├── .napplet/config.yaml
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
├── .napplet/config.yaml
└── packages/
    ├── feed/dist/index.html
    ├── wiki/dist/index.html
    └── settings/dist/index.html
```

```yaml
version: 1
relays:
  - wss://relay.example
blossomServers:
  - https://blossom.example
defaultTarget: named
discover:
  enabled: true
  roots:
    - packages
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

The default `napplet-conformance` setting runs the maintained runner using the CLI’s private runtime and package cache. No host package manager or global conformance executable is required. Override it in `.napplet/config.yaml` with `conformance.command` when using another runner.

`napplet paja` forwards to the configured Paja command:

```sh
napplet paja -- --port 5173
napplet paja -- pnpm vite --host 127.0.0.1
```

The default provisions `@kehto/cli@0.5.4` privately and runs its `kehto paja` command; override it with `paja.command`. A bare command after the separator is passed to Kehto as its managed app server command.

## Troubleshooting

- Run `napplet debug` before `deploy`; it shows the candidates and manifest templates without publishing.
- Run `napplet keys doctor` to see the selected store. When using encrypted local storage, provide its password at the terminal or through `NAPPLET_KEYSTORE_PASSWORD`.
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


### Compile experiments

Run these tasks from a repository checkout with Deno 2.9.5 or newer. Each task compiles `src/standalone.ts` for the current machine into `packages/cli/dist/experiments/`; Windows adds `.exe`. Outputs have distinct names so experiments can be compared without replacing release artifacts. The normal `build` task checks types and builds all five release targets with QuickJS and dependency pruning (`--engine quickjs --exclude-unused-npm`). Release and standalone smoke workflows pin Deno 2.9.5. Individual compile tasks skip type checking; run `deno task check` first.

| Task | Output name | Experiment |
| --- | --- | --- |
| `compile` | `napplet-v8` | Default V8 baseline |
| `compile:pruned` | `napplet-pruned` | Embed only reachable npm packages (`--exclude-unused-npm`) |
| `compile:bundle` | `napplet-bundle` | Bundle and tree-shake dependencies (`--bundle`) |
| `compile:minify` | `napplet-minify` | Bundle and minify (`--bundle --minify`) |
| `compile:no-code-cache` | `napplet-no-code-cache` | Omit the V8 code cache (`--no-code-cache`) |
| `compile:small` | `napplet-small` | Combine pruning, bundling, minification, and no code cache |
| `compile:quickjs` | `napplet-quickjs` | Use the experimental QuickJS runtime (`--engine quickjs`) |
| `compile:quickjs-pruned` | `napplet-quickjs-pruned` | Combine QuickJS and reachable npm packages |
| `compile:quickjs-minify` | `napplet-quickjs-minify` | Combine QuickJS, bundling, and minification |

```sh
# From the repository root:
pnpm --filter @napplet/cli compile
pnpm --filter @napplet/cli compile:minify
pnpm --filter @napplet/cli compile:quickjs

# Or from packages/cli:
deno task compile:small
./dist/experiments/napplet-small --version
./dist/experiments/napplet-small --help
```

All five existing cross-compilation tasks also have pnpm aliases: `compile:linux-x86_64`, `compile:linux-aarch64`, `compile:darwin-x86_64`, `compile:darwin-aarch64`, and `compile:windows-x86_64`. These use QuickJS with dependency pruning and retain their `dist/napplet-<platform>` output paths. The experiment tasks use the host target; to experiment with another target, copy the corresponding command from `deno.json` and insert `--target <triple>` before `src/standalone.ts`.

The host-native tasks are comparison presets; `compile:quickjs-pruned` uses the same engine and pruning settings as the platform release tasks. [Deno's compile documentation](https://docs.deno.com/runtime/reference/cli/compile/) describes the engine and bundling options. QuickJS is experimental, lacks a JIT, and does not receive the same security updates as V8. Bundling and pruning can omit dependencies loaded through computed imports; minification makes stack traces less readable. A successful compile or `--help` does not establish that deployment, signing, screenshots, or managed tools work.

Run the existing standalone integration suite against a candidate binary before considering it for release. From the repository root on macOS or Linux, for example:

```sh
NAPPLET_TEST_STANDALONE=1 \
NAPPLET_TEST_BINARY="$PWD/packages/cli/dist/experiments/napplet-small" \
deno test --node-modules-dir=none -A packages/cli/tests/standalone_integration_test.ts
```

The `compile:pruned`, `compile:small`, `compile:quickjs`, and `compile:quickjs-pruned` binaries passed this full suite on the macOS ARM64 machine used for the measurements below. Other platforms and live publication were not exercised by these local experiments.

The suite needs network access for hosted templates and managed tools. For Windows, set the same environment variables using PowerShell and include the `.exe` suffix. Compare file sizes on the same platform and Deno version; the embedded runtime contributes substantially to the result.


### Measured on macOS ARM64

Deno 2.9.5, CLI 0.9.1 source, 2026-10-15. These are local measurements, not size guarantees; workspace dependency resolution and target affect the embedded payload. All nine tasks compiled successfully.

| Task | Binary size (MiB) | `--help` and `--version` |
| --- | ---: | --- |
| `compile` | 210.8 | Pass |
| `compile:pruned` | 114.5 | Pass |
| `compile:bundle` | 156.6 | Pass |
| `compile:minify` | 155.6 | Pass |
| `compile:no-code-cache` | 210.8 | Pass |
| `compile:quickjs` | 181.1 | Pass |
| `compile:quickjs-minify` | 125.9 | Fail: missing `jsr:@libs/qrcode` |
| `compile:small` | 155.6 | Pass |
| `compile:quickjs-pruned` | 84.8 | Pass |

`compile:small` combines size-oriented flags; it is not necessarily the smallest result. In this run, pruning alone beat bundling, and disabling the code cache did not change the final size. `compile:quickjs-minify` currently produces a binary that fails at startup with `error: Module not found: jsr:@libs/qrcode`; retain it as a reproduction task while evaluating newer Deno releases.

## Current and legacy event formats

From CLI **0.7.0**, deployments default to the current NIP-5D artifact-hash schema. Interactive deploys ask for `current` or `legacy`; scripts can choose with `--format current|legacy`. A non-empty description is required for current event content. Legacy output remains isolated in a temporary serializer; 0.6.x and earlier defaulted to legacy events. Current deploys upload only `/index.html` plus the blobs referenced by `icon`, `screenshot` and `preview` tags; any other built file in the deploy directory makes deploy fail with the list of those files (build a single-file artifact or use `--format legacy`).

```sh
napplet deploy --dry-run --format current
napplet deploy --format legacy
napplet migrate signed-event.json --optional theme --output migration-preview.json
```

`migrate` verifies the source signature and writes an unsigned preview with provenance. It does not publish or modify the artifact, and refuses to overwrite an existing output file. Review description, required/optional choices and pointers before signing. See the [migration guide](https://napplet.run/docs/guide/event-migration) for format differences and shell data/consent implications.

### Removing temporary legacy output

Legacy serialization lives in `src/manifest-legacy.ts`; `manifest-format.ts` owns the format choice. When retiring legacy deployment, remove that serializer, the selection prompt/flag, and the `format === "legacy"` branches in manifest construction and metadata conversion. Keep signed legacy input conversion in `migrate.ts` if old-event migration remains supported. Current-schema conformance readers have no fallback to remove.

## YAML configuration and JSON migration

Project settings live in `.napplet/config.yaml`. YAML supports comments and uses the same configuration fields as before. Use `--config path/settings.yaml` or `--config path/settings.yml` for a custom file. Configuration updates preserve comments on unchanged values.

When a command needs configuration and finds the old JSON file, it asks before migrating. Answer `y` to continue with YAML; `n` or Enter exits with `Cannot continue without migrating`. Migration retains the exact original bytes in `config.json.bak`, preserves file permissions, and removes the active JSON file only after writing YAML. Conflicting YAML or backup files stop migration without overwriting them. To roll back for an older CLI, move the YAML file aside and restore the JSON backup.

CI, redirected input, `--json`, and `-i` / `--non-interactive` do not prompt for migration. Approve conversion explicitly with `--migrate-config`:

```sh
napplet init --migrate-config -i
napplet deploy --config settings.json --migrate-config --dry-run
```

An explicit legacy `--config settings.json` path resolves to `settings.yaml` after migration, including on later invocations. The original command continues using YAML. Help and version remain available before migration. The `napplet migrate` command handles signed manifest events separately; event files and machine-readable output remain JSON.

## Repository source metadata

For current-format deploys, the CLI adds one `source` tag from the Git `origin` of the repository containing each selected build when neither config, the Vite sidecar, nor HTML already supplies it. Nested builds and Git worktrees are supported. HTTPS, HTTP, `ssh://`, and scp-style clone URLs are converted to HTTP(S) repository URLs; inferred URLs omit credentials, query strings, fragments, and the `.git` suffix. SSH remotes use HTTPS without the SSH port. Git is queried locally; no remote is contacted. If Git, a repository, or a usable origin is unavailable, the tag is omitted. Other remotes are not selected, and SSH host aliases are not expanded; configure their public source URL explicitly.

Set `metadata.source` in `.napplet/config.yaml` to override every inferred or embedded source:

```yaml
metadata:
  source: https://github.com/example/my-napplet
```

Use `source: false` in that object to omit the tag, including any sidecar or HTML source. A source override must be one absolute HTTP(S) URL without credentials or a NIP-34 `nostr://` clone URL; arrays are not accepted. The precedence is config → sidecar → HTML → Git origin. Root, named, and companion snapshot events retain the resolved source. This follows the current [NIP-5D manifest table](https://github.com/dskvr/nips/blob/nip/5d/5D.md#manifest), which permits zero or one `source` tag. Automatic Git inference does not apply to `--format legacy`; an explicit config override still does. These are CLI defaults, not additional protocol requirements.

[NIP-5D §Source](https://github.com/nostr-protocol/nips/pull/2303) also allows one `source-commit` pin and one `source-archive`. Set them explicitly; the CLI never infers a commit, because a dirty or unpushed tree would pin a revision nobody can fetch:

```yaml
metadata:
  source: https://github.com/example/my-napplet
  sourceCommit: 0123456789abcdef0123456789abcdef01234567
  sourceArchive:
    url: https://dl.example.com/my-napplet-src.tar.gz
    sha256: c0ffee…
    mimeType: application/gzip
```

Config values replace matching sidecar tags. `sourceCommit` must be a full lowercase-hex Git commit ID (40 or 64 characters); `sourceArchive.url` must be an absolute HTTPS URL without credentials or a fragment, with the archive's sha256 and MIME type. Deploy refuses malformed or repeated pins rather than signing tags clients ignore. A `source-commit` is only meaningful next to a repository `source`.

## Standalone HTML recovery

The CLI reads the head mappings from [NIP-5D, HTML Metadata for Publishing](https://github.com/nostr-protocol/nips/pull/2303), including title, description, named identifier, roles, intents with advertised parameters, required/optional domains, source, server hints, and supported PNG/JPEG/WebP data-URL icons. This is non-normative implementation guidance; the living specification remains authoritative. Embedded metadata is optional, remains untrusted publishing input, and does not replace signed manifest verification at runtime.

For current-format deployment, explicit config metadata overrides matching sidecar categories, which override matching head categories. Missing categories fall back to HTML. Explicit target/name selection and configured names override `napplet-id`; a single-project named deploy without a configured name uses the sidecar identifier, then the head identifier, before the existing `default` fallback. Monorepo traversal retains folder-based naming and filtering. Configured Blossom servers override embedded hints; when none are configured, recovered server hints supply upload destinations. The CLI validates selected destinations before manifest signing or upload: each must be a non-empty HTTP(S) origin without credentials, a path, a query, or a fragment; a trailing slash is accepted. Invalid destinations produce an error identifying their config or manifest-hint position. Relay and signing configuration are still needed for publication.

Root and named events omit lineage tags. Companion snapshots retain the CLI's selected source address as their parent; head provenance does not replace that explicit selection. Root/snapshot events omit the named identifier. Deployment does not rewrite the HTML when config or selection overrides its hints: it hashes and uploads the original bytes and signs the resolved metadata separately.

Decoded icon bytes are hashed and uploaded unchanged alongside the HTML, even when `index.html` is the only file in the deployment directory. No extracted icon file is written. If a sidecar overrides the icon, embedded bytes are used only when both hash and MIME type match that declaration. Remote, unsupported, empty, malformed, and MIME-mismatched icon URLs are ignored. Hash-only sidecars still require the matching blob to be supplied separately. Consumers verify decoding before display according to NIP-5D. Legacy-format deployment retains its previous title/description HTML fallback behavior.

Deployment manifests (current and legacy, including snapshots) and optional Zapstore application events include `["client", "napplet.run"]` before signing. This identifies the publisher using the [NIP-89 client tag](https://github.com/nostr-protocol/nips/blob/master/89.md#client-tag) and does not change artifact hashes. Dry-run templates include the same attribution.

## Presentation media

[NIP-5D §Presentation media](https://github.com/nostr-protocol/nips/pull/2303) describes screenshots and one preview video on the manifest itself, each by the sha256 of its bytes with optional `m`, `dim`, `size`, `alt` and (for the preview) `duration` fields. Current-format deploys handle them in three ways:

- Sidecar or configured `screenshot` / `preview` tags whose `x` hash matches a built file are uploaded with `/index.html` (the Vite plugin writes supplied media to `dist/<sha256>.<ext>`). Entries clients would ignore (no usable `x`, an undecodable `m`, more than one `preview`) fail the deploy instead of being signed.
- `metadata.screenshots` and `metadata.preview` publish local files kept outside the build directory. Paths resolve relative to the working directory, are hashed, sized, format-sniffed (PNG, JPEG, WebP; WebM or MP4 for the preview) and measured, and replace any sidecar entries of the same kind; an empty list clears them.
- Automatic deploy capture (below) adds its PNG as a `screenshot` tag unless `metadata.screenshots` is configured.

```yaml
metadata:
  screenshots:
    - shots/board.png
    - path: shots/editor.webp
      alt: Editing a note
  preview:
    path: shots/demo.webm
    duration: 8.5
```

`migrate` drops unusable screenshot and preview metadata from a converted event and says so in its notes. These are CLI behaviors, not protocol requirements; clients verify hashes and decoding before display.

## Screenshots and Zapstore metadata

Capture a built napplet without starting a host. The command starts a temporary local Kehto Paja preview, captures its iframe, and closes the preview afterwards. The CLI provisions its private runtime and Chromium automatically on first use, without host Node.js or npx. Screenshot and default conformance commands select the tested `@napplet/conformance-cli@0.3.3` runner explicitly, so an older project-local conformance dependency cannot intercept them. Explicit custom conformance commands remain supported. The preview uses Paja’s development identity, fresh browser storage, and live relays, so content may differ from your signed-in shell.

```sh
napplet screenshot --output preview.png
# Optional: choose another project or an existing shell.
napplet screenshot ./my-project --output other.png
# Optional: select one iframe and wait for content inside it.
napplet screenshot http://localhost:5173 --output ready.png --selector '#napplet-frame' --ready-selector '.app-ready'
```

The default capture is 1200 × 750 pixels with a 1500 ms delay. Override these with `--width`, `--height`, and `--delay` (milliseconds). The command captures only the iframe, waits for fonts, closes Chromium on success or failure, and refuses to overwrite an existing file. Keep screenshots outside the build directory.

To customize the application listing, add a `zapstore` object to `.napplet/config.yaml`:

```yaml
zapstore:
  id: org.example.notes
  name: Notes
  description: Private notes in a napplet shell.
  summary: A simple notebook
  images:
    - ./preview.png
    - https://example.org/notes-mobile.png
  icon: ./assets/icon.png
  website: https://example.org/notes
  repository: https://github.com/example/notes
  license: MIT
  tags:
    - notes
    - productivity
```

The `zapstore` object is optional. When omitted, deploy derives an application ID, name, and description from the selected manifest; a multi-build deploy uses the project directory name for its shared listing. Set `id` and `name` here to control that stable listing identity. Reusing an ID updates the listing under the signing pubkey. Configured fields take precedence over inferred values, and this configuration describes one application listing per deploy invocation.

```sh
napplet deploy --dry-run --json
napplet deploy
# Publish metadata without capturing a new screenshot:
napplet deploy --no-screenshot
# Skip both application metadata and automatic capture:
napplet deploy --no-zapstore
```

Application publication and screenshot capture default to on. `--no-screenshot` skips capture but still publishes the application event, including configured images. `--no-zapstore` skips the application event and automatic capture. `enabled: false` in the `zapstore` object also disables both; `--zapstore` overrides that setting for one deployment. Supplying both Zapstore flags or combining `--no-screenshot` with explicit screenshot options is an error. Dry runs capture a preview and show the application template and resolved media URLs without uploading or publishing.

Local PNG, JPEG and WebP images are resolved relative to the working directory, hashed, and uploaded to the configured Blossom servers. Existing HTTP(S) image URLs are used as supplied. Local media URLs point to the first selected Blossom server; if those uploads fail, application publication is skipped and deploy exits nonzero even if another mirror succeeds. The application uses the same signer and relays as the deployment. A requested application event must be accepted by at least one relay for deploy to succeed.

The listing uses kind `32267` from the [Software Applications proposal](https://github.com/nostr-protocol/nips/pull/1336), with screenshot URLs in `image` tags. It is published as a separate event before the napplet manifests. The current [NIP-5D manifest](https://github.com/nostr-protocol/nips/pull/2303) does not define an application reference tag, so deploy leaves manifest tags and artifact hashes unchanged. This publishes application metadata only, without software release or asset events; acceptance into a particular store's catalog depends on that store.

Deploy starts a local preview for each distinct selected build, captures a temporary PNG, appends it to the application images for that deployment, and adds the same capture to that build's current-format manifests as a NIP-5D `screenshot` tag (`x`, `m image/png`, `dim`, `size`) so the blob is uploaded once and referenced by hash. Configured `metadata.screenshots` keep their own list instead of the capture. Capture failure stops deployment before any upload or relay publication. The temporary image is removed after success or failure. Capture diagnostics go to stderr so `--json` stdout remains valid JSON. No host URL is required. Root and snapshot selections of the same artifact share one capture. To capture an existing shell instead, use `--screenshot <preview-url>`. Use `--screenshot-selector`, `--screenshot-ready-selector`, `--screenshot-width`, `--screenshot-height`, and `--screenshot-delay` for the corresponding capture options. Use the standalone `napplet screenshot` command when you want to keep a PNG on disk.

### Standalone regression test

The opt-in integration test compiles the release entrypoint and runs with an empty host-tool PATH and a fresh private cache. It exercises hosted template creation, configuration, discovery, debug, key storage, screenshots, inline deploy capture, default conformance, Paja, and cached browser reuse. It needs network access on first use; no host runtime is available to the tested binary.

```sh
NAPPLET_TEST_STANDALONE=1 deno test --node-modules-dir=none -A packages/cli/tests/standalone_integration_test.ts
```

### GAMEPAD integration

GAMEPAD is a bare manifest domain accepted by `init`, `build`, and deployment metadata. Controller fallback apps use `O gamepad`; controller-required apps use `R gamepad`. Live `dev` controller input depends on a GAMEPAD-capable Kehto/Paja release. See the proposed [NAP-GAMEPAD](https://github.com/napplet/naps/pull/108).

### Torrent capabilities

Use the bare `torrent` domain in required or optional deployment metadata. A transfer-focused napplet can declare `R torrent`; an optional torrent integration uses `O torrent` and checks runtime presence. Build and deployment support do not imply that the preview shell has a torrent engine. See the living [NAP-TORRENT proposal](https://github.com/napplet/naps/blob/nap-torrent/naps/NAP-TORRENT.md).
