# @napplet/cli

> Standalone CLI for creating, configuring, inspecting, and deploying napplets.

`@napplet/cli` is the command-line deploy and diagnostics tool for built
napplets. It creates `.napplet/config.yaml`, discovers built `index.html`
artifacts, inspects deploy plans, signs manifest events, uploads files to
Blossom servers, publishes to relays, and runs local napplet tooling such as
conformance and Paja.

The standalone binary runs every built-in command without separately installed Node.js, npm, npx, Deno, Git, Kehto, or browser tooling. Screenshot, conformance, and Paja commands download a private, checksum-verified Node runtime and maintained packages on first use; browser commands also provision Chromium. Linux captures include the browser libraries and fonts. Downloads live in the CLI cache and never install into your project or global PATH.

First use of these tools requires network access and a writable cache. Later invocations reuse the downloads. The default cache is `~/Library/Caches/napplet` on macOS, `$XDG_CACHE_HOME/napplet` (or `~/.cache/napplet`) on Linux, and `%LOCALAPPDATA%\napplet` on Windows. Set `NAPPLET_CACHE_DIR` to choose another location; copying a populated cache between machines with the same OS and architecture supports offline tooling. User-configured `conformance.command`, `paja.command`, and app-server commands passed to Paja use the software you explicitly select.

The generated Vite project and optional skills.sh CLI still need their own development dependencies. Agent skills are installed separately — see [Agent skills](/guide/agent-skills).

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

The installers download from the [stable CLI release](https://github.com/napplet/napplet/releases/tag/napplet-cli) and verify the asset against its `SHA256SUMS`. Linux and macOS support x64 and ARM64; Windows supports x64.

### Check the installed version

```sh
napplet --version
# Also available: napplet -v or napplet version
```

This prints the version of the CLI you actually invoked. If you have both standalone and Deno installations, use `type -a napplet` on macOS/Linux or `Get-Command napplet -All` in PowerShell to check which executable takes precedence. A version command reported as unknown means that installation predates version reporting.

### JSR/Deno alternative

```bash
deno install --global \
  --allow-read --allow-write --allow-run --allow-env --allow-net \
  --name napplet \
  jsr:@napplet/cli/cli
```

To refresh an existing JSR installation, rerun the command with `--force --reload` after `--global`. Then check the Deno-installed executable directly (`~/.deno/bin/napplet --version` with Deno's default install location); another `napplet` earlier on `PATH` is unaffected. See [Deno's install reference](https://docs.deno.com/runtime/reference/cli/install/) for custom install locations and upgrade flags.


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
  targets in `.napplet/config.yaml`. In an interactive terminal it guides setup and shows live suggestions from
  relays such as `wss://relaypag.es`, and suggests Blossom servers from kind
  `10063` server-list events.
- `npx skills add napplet/napplet` installs the `napplet-*` agent skills for whichever coding agents you use; it is the skills.sh CLI, not a `napplet` subcommand.
- `napplet debug` prints resolved config, discovered napplets, deploy targets, manifest templates, and signing readiness without network writes. Manifest template failures (for example a missing description, or built files a current deploy would drop) are reported in `manifests.error` instead of aborting, and `--format current|legacy` selects the event format inspected.
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
napplet init [--force] [--root] [--source-dir <dir>] [--name <dtag>] [--title <title>] [--description <text>] [--archetype <napplet:archetype/intent>] [--relay <url>] [--server <url>]
napplet discover [--config <file>] [--all]
napplet debug [--format current|legacy] [--config <file>] [--all] [--root] [--name <dtag>] [--snapshot] [--sec <secret>]
napplet deploy [--format current|legacy] [--config <file>] [--all] [--root] [--name <dtag>] [--snapshot] [--sec <secret>] [--prompt-sec] [--zapstore | --no-zapstore] [--no-screenshot] [--screenshot [<preview-url>]] [--dry-run]
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

## YAML configuration and JSON migration

Project settings live in `.napplet/config.yaml`. YAML supports comments and uses the same configuration fields as before. Use `--config path/settings.yaml` or `--config path/settings.yml` for a custom file. Configuration updates preserve comments on unchanged values.

When a command needs configuration and finds the old JSON file, it asks before migrating. Answer `y` to continue with YAML; `n` or Enter exits with `Cannot continue without migrating`. Migration retains the exact original bytes in `config.json.bak`, preserves file permissions, and removes the active JSON file only after writing YAML. Conflicting YAML or backup files stop migration without overwriting them. To roll back for an older CLI, move the YAML file aside and restore the JSON backup.

CI, redirected input, `--json`, and `-i` / `--non-interactive` do not prompt for migration. Approve conversion explicitly with `--migrate-config`:

```sh
napplet init --migrate-config -i
napplet deploy --config settings.json --migrate-config --dry-run
```

An explicit legacy `--config settings.json` path resolves to `settings.yaml` after migration, including on later invocations. The original command continues using YAML. Help and version remain available before migration. The `napplet migrate` command handles signed manifest events separately; event files and machine-readable output remain JSON.

## Archetype conventions

Pass each `--archetype` option as a queryless convention URI, for example `napplet:profile/open`. The CLI derives the role from the URI. YAML configuration accepts URI strings directly:

```yaml
metadata:
  archetypes:
    - napplet:profile/open
```

The CLI normalizes each URI to an object such as `{ "slug": "profile", "convention": "napplet:profile/open" }`. Existing object configs remain supported; add `"params": ["pubkey"]` to an object to advertise accepted parameter names. Older role-prefixed CLI inputs remain supported for compatibility.

This example emits the independent advertisements:

```json
["z", "profile"]
["i", "napplet:profile/open"]
```

This non-normative guide follows the living [NAP-INTENT manifest catalog contract](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md#manifest-catalog-contract). A convention is eligible for dispatch when its archetype segment matches a `z` role on the same manifest. Metadata convention identities are queryless and fragment-free. Trailing `i` values advertise parameter names, not event-kind restrictions or parameter values.

## See also

- [`@napplet/vite-plugin`](./vite-plugin) — emits build-side manifest metadata
  the CLI preserves during deploy.
- [`@napplet/conformance-cli`](./conformance-cli) — the default command behind
  `napplet conformance`; the standalone CLI provisions it in its private cache without a host package manager or global conformance executable.
- [Getting started](/guide/getting-started) — scaffold, build, and verify a
  napplet before deploying.


## Current and legacy event formats

From CLI **0.7.0**, deployments default to the current NIP-5D artifact-hash schema. Interactive deploys ask for `current` or `legacy`; scripts can choose with `--format current|legacy`. A non-empty description is required for current event content. Legacy output remains isolated in a temporary serializer; 0.6.x and earlier defaulted to legacy events. Current deploys upload only `/index.html` plus the blobs referenced by `icon`, `screenshot` and `preview` tags; any other built file in the deploy directory makes deploy fail with the list of those files (build a single-file artifact or use `--format legacy`). When config metadata or the Vite plugin sidecar lists a domain as both required and optional, it is emitted only as `O`, matching the Vite plugin.

```sh
napplet deploy --dry-run --format current
napplet deploy --format legacy
napplet migrate signed-event.json --optional theme --output migration-preview.json
```

`migrate` verifies the source signature and writes an unsigned preview with provenance. It does not publish or modify the artifact, and refuses to overwrite an existing output file. Review description, required/optional choices and pointers before signing. See the [migration guide](https://napplet.run/docs/guide/event-migration) for format differences and shell data/consent implications.

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

Signed or unsigned sidecars can contain additional Nostr tags. Deploy preserves their full string payloads, order, and repeated values through signing and companion snapshots; migration preserves them too. Config overrides and CLI-managed publication fields still apply, but tag names are not restricted to a napplet allowlist. A current event's extra `path`, `description`, `requires`, or `archetype` tag is not a legacy publishing instruction. Extra `description` tags remain separate from event content. These are implementation notes; [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md) and the living [NIP-5D proposal](https://github.com/nostr-protocol/nips/pull/2303) define the event format.

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

## Key storage without system helpers

Native keychains are used when available. Otherwise, key commands use password-encrypted local files in `~/.napplet/keys` (AES-256-GCM, PBKDF2-SHA256 with 600,000 iterations). Enter a password of at least 12 characters at the hidden prompt, or set `NAPPLET_KEYSTORE_PASSWORD` for non-interactive use. The password is not stored; reuse it to unlock your keys. Set `NAPPLET_KEYSTORE=portable` to select this store explicitly and `NAPPLET_KEYSTORE_DIR` to change its location. `napplet keys doctor` reports the selected provider.

## Interactive terminals and CI

Human terminal sessions show the napplet banner, grouped help, colored deployment summaries, and live upload/publish progress with filled `█` blocks and a `░` remaining track. `napplet deploy` prompts for missing configuration values before signing, preserves existing values, and offers to save completed settings. Use `napplet deploy --dry-run` to preview without uploading or publishing.

Use `-i` or `--non-interactive` on any command to disable prompts. CI and redirected streams do this automatically. Missing required values produce actionable errors; supply them through configuration or `--source-dir`, `--description`, `--relay`, and `--server`. `--json` keeps deploy stdout machine-readable, and `NO_COLOR=1` or `--no-color` disables colors.

```sh
napplet deploy -i --format current --json
napplet init -i --name notes --description "Private notes"
```

Signing secrets remain hidden and are never saved in project configuration. `--prompt-sec` can consume explicitly piped input in automation. Set `NAPPLET_KEYSTORE_PASSWORD` for encrypted local keys; `keys connect` requires interactive remote approval, so CI should use an existing key or session.

BLOSSOM capability declarations use the bare `blossom` domain in required (`R`) or optional (`O`) manifest tags. Deployment preserves either declaration; this does not grant runtime access. The CLI's own Blossom deployment uploader is separate from [NAP-BLOSSOM](https://github.com/napplet/naps/pull/71), which a compatible host injects for napplet calls.
