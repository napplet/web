# Deploy progress and report polish

## Problem

`napplet deploy` now reaches signing, but the network deploy path still feels
opaque while uploads run and the terminal report is a plain diagnostic dump
instead of an operator-friendly CLI surface.

## Target

- Keep `--json` and non-interactive behavior machine-readable.
- Add truthful terminal progress for upload and relay publish steps.
- Make the final terminal report easier to scan with clear status markers,
  copyable NIP-19 pointers, and compact failure/success sections.
- Do not change NIP-5D or NAP protocol surface.

## Verification

- Add focused unit coverage for terminal progress and report rendering.
- Run CLI checks/tests.
- Smoke the failing gbcolor deploy path enough to confirm it still enters
  interactive NIP-46 instead of regressing.
