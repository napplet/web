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
  targets in `.napplet/config.json`. In an interactive terminal it guides setup and shows live suggestions from
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
napplet deploy [--format current|legacy] [--config <file>] [--all] [--root] [--name <dtag>] [--snapshot] [--sec <secret>] [--prompt-sec] [--zapstore | --no-zapstore] [--dry-run]
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

Pass each `--archetype` option as a queryless convention URI, for example `napplet:profile/open`. The CLI derives the role from the URI. JSON configuration accepts URI strings directly:

```json
{
  "metadata": {
    "archetypes": ["napplet:profile/open"]
  }
}
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
  `napplet conformance`; the standalone CLI resolves it through `npx`, without requiring a global
  `napplet-conformance` executable.
- [Getting started](/guide/getting-started) — scaffold, build, and verify a
  napplet before deploying.


## Current and legacy event formats

From CLI **0.7.0**, deployments default to the current NIP-5D artifact-hash schema. Interactive deploys ask for `current` or `legacy`; scripts can choose with `--format current|legacy`. A non-empty description is required for current event content. Legacy output remains isolated in a temporary serializer; 0.6.x and earlier defaulted to legacy events. Current deploys upload only `/index.html` plus the blob referenced by an `icon` tag; any other built file in the deploy directory makes deploy fail with the list of those files (build a single-file artifact or use `--format legacy`). When config metadata or the Vite plugin sidecar lists a domain as both required and optional, it is emitted only as `O`, matching the Vite plugin.

```sh
napplet deploy --dry-run --format current
napplet deploy --format legacy
napplet migrate signed-event.json --optional theme --output migration-preview.json
```

`migrate` verifies the source signature and writes an unsigned preview with provenance. It does not publish or modify the artifact, and refuses to overwrite an existing output file. Review description, required/optional choices and pointers before signing. See the [migration guide](https://napplet.run/docs/guide/event-migration) for format differences and shell data/consent implications.

## Standalone HTML recovery

The CLI reads the head mappings from [NIP-5D, HTML Metadata for Publishing](https://github.com/nostr-protocol/nips/pull/2303), including title, description, named identifier, roles, intents with advertised parameters, required/optional domains, source, server hints, and supported PNG/JPEG/WebP data-URL icons. This is non-normative implementation guidance; the living specification remains authoritative. Embedded metadata is optional, remains untrusted publishing input, and does not replace signed manifest verification at runtime.

For current-format deployment, explicit config metadata overrides matching sidecar categories, which override matching head categories. Missing categories fall back to HTML. Explicit target/name selection and configured names override `napplet-id`; a single-project named deploy without a configured name uses the sidecar identifier, then the head identifier, before the existing `default` fallback. Monorepo traversal retains folder-based naming and filtering. Configured Blossom servers override embedded hints; when none are configured, recovered server hints supply upload destinations. The CLI validates selected destinations before manifest signing or upload: each must be a non-empty HTTP(S) origin without credentials, a path, a query, or a fragment; a trailing slash is accepted. Invalid destinations produce an error identifying their config or manifest-hint position. Relay and signing configuration are still needed for publication.

Root and named events omit lineage tags. Companion snapshots retain the CLI's selected source address as their parent; head provenance does not replace that explicit selection. Root/snapshot events omit the named identifier. Deployment does not rewrite the HTML when config or selection overrides its hints: it hashes and uploads the original bytes and signs the resolved metadata separately.

Decoded icon bytes are hashed and uploaded unchanged alongside the HTML, even when `index.html` is the only file in the deployment directory. No extracted icon file is written. If a sidecar overrides the icon, embedded bytes are used only when both hash and MIME type match that declaration. Remote, unsupported, empty, malformed, and MIME-mismatched icon URLs are ignored. Hash-only sidecars still require the matching blob to be supplied separately. Consumers verify decoding before display according to NIP-5D. Legacy-format deployment retains its previous title/description HTML fallback behavior.

## Screenshots and optional Zapstore metadata

Capture the napplet iframe from a running preview shell (for example, the URL opened by `napplet paja`). This command uses the maintained browser runner via npm and requires Node.js 20+ and Playwright Chromium. Install the matching browser with `npx --yes --package @napplet/conformance-cli playwright install chromium`.

```sh
napplet screenshot http://localhost:5173 --output preview.png
# Optional: select one iframe and wait for content inside it.
napplet screenshot http://localhost:5173 --output ready.png --selector '#napplet-frame' --ready-selector '.app-ready'
```

The default capture is 1200 × 750 pixels with a 1500 ms delay. Override these with `--width`, `--height`, and `--delay` (milliseconds). The command captures only the iframe, waits for fonts, closes Chromium on success or failure, and refuses to overwrite an existing file. Keep screenshots outside the build directory.

To publish an optional application listing, add a `zapstore` object to `.napplet/config.json`:

```json
{
  "zapstore": {
    "id": "org.example.notes",
    "name": "Notes",
    "description": "Private notes in a napplet shell.",
    "summary": "A simple notebook",
    "images": ["./preview.png", "https://example.org/notes-mobile.png"],
    "icon": "./assets/icon.png",
    "website": "https://example.org/notes",
    "repository": "https://github.com/example/notes",
    "license": "MIT",
    "tags": ["notes", "productivity"]
  }
}
```

Only `id` and `name` are required within this object. The stable `id` identifies the application listing under the signing pubkey; reusing it updates that listing. Description falls back to the deployment config's description. This configuration describes one application listing per deploy invocation, including deployments that select multiple manifests.

```sh
napplet deploy --zapstore --dry-run --json
napplet deploy --zapstore
```

Publishing defaults to off. `--zapstore` enables it for one deployment; `"enabled": true` in the object enables it by default; `--no-zapstore` disables it for one deployment. Supplying both flags is an error. Dry runs show the application template, resolved media URLs and any signature without uploading or publishing.

Local PNG, JPEG and WebP images are resolved relative to the working directory, hashed, and uploaded to the configured Blossom servers. Existing HTTP(S) image URLs are used as supplied. Local media URLs point to the first selected Blossom server; if those uploads fail, application publication is skipped and deploy exits nonzero even if another mirror succeeds. The application uses the same signer and relays as the deployment. A requested application event must be accepted by at least one relay for deploy to succeed.

The listing uses kind `32267` from the [Software Applications proposal](https://github.com/nostr-protocol/nips/pull/1336), with screenshot URLs in `image` tags. It is separate from the current [NIP-5D manifest](https://github.com/nostr-protocol/nips/pull/2303/files) and does not change the artifact hash or add a manifest `app` pointer. This publishes application metadata only, without software release or asset events; acceptance into a particular store's catalog depends on that store.
