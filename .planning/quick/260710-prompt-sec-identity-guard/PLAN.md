# Prompt secret identity guard

## Problem

`napplet deploy --prompt-sec` accepts a hidden secret and signs immediately, even when the project
config already points at a specific bunker/pubkey. Nsyte warns before continuing in that case so a
user does not accidentally deploy under the wrong identity.

## Target

- Compare the prompted signer pubkey with configured signing identity when one exists.
- In interactive terminals, show both identities and require an explicit confirmation before
  continuing.
- In non-interactive prompt input, fail closed on mismatch.
- Preserve explicit `--sec`, stored key, configured bunker, and CI behavior.

## Verification

- Unit coverage for prompt-secret match, interactive mismatch approval, and non-interactive mismatch
  rejection.
- CLI package check/test/lint.
- Root gates before pushing.
