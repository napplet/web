# Bunker reconnect fallback

## Problem

Nsyte recovers a missing stored bunker session by using the configured bunker
pubkey and moving the user into a reconnect path. `napplet deploy` can currently
write both `signing.keyReference` and a bunker pubkey, but a later missing key
reference fails before the configured pubkey can be used for recovery.

## Target

- If a configured `signing.keyReference` is missing but the config also names a
  bunker pubkey, interactive deploy should reconnect with that expected pubkey.
- Non-interactive deploy should still fail closed with a clear missing-key
  message.
- `napplet keys connect` should persist the connected bunker pubkey and relays,
  not just the key reference, so future deploys have a reconnect target.

## Verification

- Unit coverage for stale key references falling through to expected-pubkey
  reconnect.
- Unit coverage for non-interactive stale key references failing without
  reconnect.
- Unit coverage that `keys connect` writes remote signer pubkey and relays.
- CLI package checks plus root gates before pushing.
