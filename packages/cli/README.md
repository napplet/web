# @napplet/cli

Deno CLI for working with napplets.

This first package slice provides:

- `napplet init` for a singular `.napplet/config.json`.
- `napplet discover --all` for traversing configured roots and staging built napplet directories.
- `napplet deploy` for root, named, and snapshot deploy planning, Blossom uploads, relay publish,
  and local private-key event signing.
- `napplet keys store/use/list/delete/doctor` for local key references in the platform keychain.
- `napplet conformance` as a wrapper around `@napplet/conformance-cli`.
- `napplet paja` as a wrapper around `kehto paja`.
- signing input classification compatible with nsyte-style `--sec`, `--prompt-sec`, stored
  references, and CI revocable-key references.

Local key storage uses native platform secure storage: macOS Keychain, Windows Credential Manager,
or Linux Secret Service via `secret-tool` with a D-Bus session. If no native provider is available,
key commands fail closed rather than writing secrets to plaintext.

Network deploy currently requires a local hex or `nsec` private key from `--sec`, `--prompt-sec`, or
the configured native key-store reference. `--dry-run` emits the same plan plus root, named, and
companion snapshot manifest events without uploading files or publishing to relays. Signer modes
that cannot provide a local pubkey yet keep snapshot templates explicitly skipped in dry-run output.

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
