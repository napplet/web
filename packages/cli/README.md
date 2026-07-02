# @napplet/cli

Deno CLI for working with napplets.

This first package slice provides:

- `napplet init` for a singular `.napplet/config.json`.
- `napplet discover --all` for traversing configured roots and staging built napplet directories.
  In this monorepo mode each discovered napplet deploys under its own folder name as the named-site
  `d` tag; `--name`/`config.named` then act as a filter selecting which folders to deploy. Folder
  names used as `d` tags must be valid (`^[a-z0-9-]{1,13}$`, no trailing `-`).
- `napplet deploy` for root, named, and snapshot deploy planning, Blossom uploads, relay publish,
  and local or `nbunksec` event signing.
- `napplet debug` for read-only JSON diagnostics covering config, discovery, deploy-plan,
  manifest-template, and signing readiness state.
- `napplet keys store/use/list/delete/doctor` for local key references in the platform keychain.
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

`napplet debug [--all] [--root] [--name <dtag>] [--snapshot] [--sec <secret>]` prints the same
operator-facing discovery and deploy planning state without uploading blobs or publishing events.
Signing secrets are classified but not printed.

## Keys

```sh
napplet keys doctor
napplet keys store --name default --sec nsec1...
napplet keys use --name default
napplet keys list
napplet keys delete --name default
```

## Development

```sh
deno task check      # type-check
deno task build      # type-check, then compile standalone binaries into dist/
deno task test:unit
```

`deno task build` runs `deno compile` for each supported target (Linux x86_64/aarch64,
macOS x86_64/aarch64, Windows x86_64) and writes standalone `napplet-<target>` binaries to
`dist/`, requiring no local Deno or Node install to run. Use `deno task compile:<target>` to
build a single target.
