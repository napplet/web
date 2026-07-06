# @napplet/cli

Deno CLI for working with napplets.

This first package slice provides:

- `napplet init` for a singular `.napplet/config.json`.
- `napplet discover --all` for traversing configured roots and staging built napplet directories
  (see [Project layouts](#project-layouts) for single-repo vs monorepo behavior).
- `napplet deploy` for root, named, and snapshot deploy planning, Blossom uploads, relay publish,
  and local or `nbunksec` event signing.
- `napplet debug` for read-only JSON diagnostics covering config, discovery, deploy-plan,
  manifest-template, and signing readiness state.
- `napplet keys store/connect/use/list/delete/doctor` for local key references in the platform
  keychain, including NIP-46 remote-signer login via `keys connect`.
- `napplet conformance` as a wrapper around `@napplet/conformance-cli`.
- `napplet paja` as a wrapper around `kehto paja`.
- signing input classification compatible with nsyte-style `--sec`, `--prompt-sec`, stored
  references, and CI revocable `nbunksec` references.

Local key storage uses native platform secure storage: macOS Keychain, Windows Credential Manager,
or Linux Secret Service via `secret-tool` with a D-Bus session. If no native provider is available,
key commands fail closed rather than writing secrets to plaintext.

Network deploy currently requires a hex, `nsec`, or `nbunksec` signer from `--sec`, `--prompt-sec`,
the configured native key-store reference, or `NAPPLET_CI_SIGNING_KEY` when `.napplet` is in CI
signing mode. `--dry-run` emits the same plan plus root, named, and companion snapshot manifest
events without uploading files or publishing to relays. Raw `bunker://` pairing is not implemented
yet; generate and pass an `nbunksec` for CI-style remote signing.

When a built napplet includes a plugin-generated `.nip5a-manifest.json`, deploy templates preserve
canonical `requires` tags from that sidecar on root, named, and companion snapshot manifests.

Deploy also reads the built `index.html` and emits the NIP-5A single-value `title` / `description`
manifest tags from its plain-HTML `<title>` element and `<meta name="description">` element (as
authored by `@napplet/vite-plugin`'s `title` / `description` options). Values are entity-decoded and
trimmed; empty or missing values emit no tag, and at most one `["title", …]` and one
`["description", …]` tag are emitted on root, named, and companion snapshot manifests. These are
plain HTML read back out at deploy time — not `napplet-*` protocol meta tags.

`napplet debug [--all] [--root] [--name <dtag>] [--snapshot] [--sec <secret>]` prints the same
operator-facing discovery and deploy planning state without uploading blobs or publishing events.
Signing secrets are classified but not printed.

## Project layouts

The CLI works in two layouts. The difference is entirely in **discovery**: without `--all` it looks
at a single source directory; with `--all` it walks configured roots and treats every built napplet
it finds as its own deploy target. Everything downstream (manifests, Blossom upload, relay publish,
signing) is the same.

### Single napplet repo

The repository _is_ one napplet. Discovery looks only at `sourceDir` (default `.`), preferring a
built `dist/index.html` and falling back to a top-level `index.html`.

```
my-napplet/
├── .napplet/config.json
├── dist/            # built output discovered by the CLI
│   └── index.html
└── src/…
```

```json
{
  "version": 1,
  "sourceDir": ".",
  "relays": ["wss://relay.example"],
  "blossomServers": ["https://blossom.example"],
  "defaultTarget": "named",
  "named": ["my-napplet"]
}
```

```sh
# scaffold the config
napplet init --relay wss://relay.example --server https://blossom.example --name my-napplet

napplet debug                       # inspect the resolved plan, no network
napplet deploy --dry-run --sec nsec1…   # build + sign manifests, no upload/publish
napplet deploy --sec nsec1…             # upload blobs and publish manifests
```

The named-site `d` tag comes from `--name` / `config.named`, falling back to `default` when unset.
Use `--root` to publish the singular replaceable root napplet (kind 15129) instead of a named
napplet, and `--snapshot` to also emit an immutable snapshot (kind 5129) companion.

### Napplet monorepo

Several napplets live in one workspace. Set `discover.roots` to the directories to walk, and run
commands with `--all`. Each discovered napplet deploys under **its own folder name** as the
named-site `d` tag — there is no cross product, so `feed/` publishes to `d=feed`, `wiki/` to
`d=wiki`, and so on.

```
my-workspace/
├── .napplet/config.json
└── packages/
    ├── feed/dist/index.html      # → d=feed
    ├── wiki/dist/index.html      # → d=wiki
    └── settings/dist/index.html  # → d=settings
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
napplet discover --all                     # list every napplet found under roots
napplet deploy --all --dry-run --sec nsec1…    # plan every napplet, no network
napplet deploy --all --sec nsec1…              # deploy every napplet under its folder name
napplet deploy --all --name feed --sec nsec1…  # deploy only the feed/ napplet
```

Notes for monorepo mode:

- `--name` / `config.named` act as a **filter** over folder names, not as the deploy target — an
  empty list deploys every discovered napplet.
- Folder names used as `d` tags must be valid: `^[a-z0-9-]{1,13}$` and no trailing `-`. An invalid
  folder name fails the plan early, naming the offending directory.
- Traversal skips `.git`, `.napplet`, `.turbo`, `node_modules`, and `coverage`, and stops descending
  a branch once it finds a napplet (a `dist/index.html` or `index.html`), so nested build assets are
  never double-counted.
- `--root` is a poor fit for `--all`: the root site is singular per pubkey, so deploying many
  napplets to it would have them overwrite one another.

## Keys

```sh
napplet keys doctor
napplet keys store --name default --sec nsec1...
napplet keys connect --name remote --relay wss://relay.nsec.app
napplet keys use --name default
napplet keys list
napplet keys delete --name default
```

### Remote signer login (`keys connect`)

`napplet keys connect --name <ref> [--relay <url> ...] [--config <file>]` runs a
[NIP-46](https://github.com/nostr-protocol/nips/blob/master/46.md) remote-signer login so you can
pair a signer (for example a phone app) without pasting a raw `nsec`. It prints a scannable
`nostrconnect://` QR code and, at the same time, waits for a `bunker://` URL pasted on stdin —
whichever completes first wins the race and the other is cancelled. When `--relay` is omitted it
listens on `wss://relay.nsec.app` and `wss://bucket.coracle.social`.

On success the paired session is encoded as an `nbunksec`, stored in the platform keychain under
`--name`, and `.napplet` `signing.keyReference` is pointed at it — the same lifecycle as
`keys store` + `keys use`. The stored `nbunksec` is consumed by the existing deploy sign-time path;
only the reference name is written to `.napplet`, never the secret.

> NIP-46 is Nostr remote-signing transport. It is independent of the napplet ⇄ shell protocol
> (NIP-5D) and does not add any napplet protocol surface.

## Development

```sh
deno task check      # type-check
deno task build      # type-check, then compile standalone binaries into dist/
deno task test:unit
```

`deno task build` runs `deno compile` for each supported target (Linux x86_64/aarch64, macOS
x86_64/aarch64, Windows x86_64) and writes standalone `napplet-<target>` binaries to `dist/`,
requiring no local Deno or Node install to run. Use `deno task compile:<target>` to build a single
target.

Dependencies are declared in `deno.json` `imports`. The npm dependency (`nostr-tools`) is mirrored
in `package.json`; the JSR-only dependencies (`@libs/qrcode` for `keys connect` QR rendering and
`@std/streams` for stdin line reading) have no npm equivalent and live in `deno.json` only.
