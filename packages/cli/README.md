# @napplet/cli

Deno CLI for working with napplets.

This first package slice provides:

- `napplet init` for a singular `.napplet/config.json`.
- `napplet discover --all` for traversing configured roots and staging built napplet directories.
- `napplet deploy` for root, named, and snapshot deploy planning, Blossom uploads, relay publish,
  and local or `nbunksec` event signing.
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
deno task build
deno task test:unit
```
