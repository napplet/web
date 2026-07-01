# @napplet/cli

Deno CLI for working with napplets.

This first package slice provides:

- `napplet init` for a singular `.napplet/config.json`.
- `napplet discover --all` for traversing configured roots and staging built napplet directories.
- `napplet deploy --dry-run` for root, named, and snapshot deploy planning.
- `napplet conformance` as a wrapper around `@napplet/conformance-cli`.
- `napplet paja` as a wrapper around `kehto paja`.
- signing input classification compatible with nsyte-style `--sec`, `--prompt-sec`, stored
  references, and CI revocable-key references.

Network upload/publish, real event signing, and platform keychain storage are not enabled yet.
Commands that would need network deploy side effects currently require `--dry-run` and emit a plan.

## Development

```sh
deno task build
deno task test:unit
```
