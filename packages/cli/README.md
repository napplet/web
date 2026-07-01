# @napplet/cli

Deno CLI for working with napplets.

This first package slice provides:

- `napplet init` for a singular `.napplet/config.json`.
- `napplet discover --all` for traversing configured roots and staging built napplet directories.
- `napplet deploy --dry-run` for root, named, and snapshot deploy planning with NIP-5A manifest
  templates and local private-key event signing.
- `napplet keys store/use/list/delete/doctor` for local key references in the platform keychain.
- `napplet conformance` as a wrapper around `@napplet/conformance-cli`.
- `napplet paja` as a wrapper around `kehto paja`.
- signing input classification compatible with nsyte-style `--sec`, `--prompt-sec`, stored
  references, and CI revocable-key references.

Local key storage uses native platform secure storage: macOS Keychain, Windows Credential Manager,
or Linux Secret Service via `secret-tool` with a D-Bus session. If no native provider is available,
key commands fail closed rather than writing secrets to plaintext.

Network upload/publish is not enabled yet. Commands that would need network deploy side effects
currently require `--dry-run` and emit a plan plus manifest templates. Dry-run output includes
signed root, named, and companion snapshot events when signing can resolve a local hex or `nsec`
private key from `--sec`, `--prompt-sec`, or the configured native key-store reference. Snapshot
templates stay explicitly skipped for signer modes that cannot provide a local pubkey yet.

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
