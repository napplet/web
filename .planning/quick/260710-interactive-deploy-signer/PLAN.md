# Interactive deploy signer fallback

## Problem

`napplet deploy` still exits before interactive signer setup when the user does
not pass `--sec` or `--prompt-sec`, which makes the CLI unusable for the normal
network-deploy path.

## Target

- Preserve explicit `--sec` and `--prompt-sec` behavior.
- When no secret flag is passed, use configured signer material first.
- If only a configured npub/pubkey is available, connect to that NIP-46 signer
  instead of failing.
- If no configured signer exists and the terminal is interactive, enter the
  existing NIP-46 connection flow and then continue deploy.
- Keep CI / JSON / non-interactive runs explicit instead of hanging.

## Verification

- Add focused unit coverage for the fallback resolver.
- Run package CLI tests.
- Run the repository checks required for this PR branch before pushing.
