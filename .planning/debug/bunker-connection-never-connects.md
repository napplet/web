---
status: resolved
trigger: "The bunker connection never connects; the same remote signer and key works immediately in nsyte."
created: 2026-07-11
updated: 2026-07-11
---

# Debug Session: bunker-connection-never-connects

## Symptoms

- Expected behavior: Nostr Connect pairing should complete with the same remote
  signer/key that connects immediately in nsyte.
- Actual behavior: napplet's bunker connection path never connects.
- Error messages: none reported; observed as a hang/non-completion.
- Timeline: observed after the CLI UX parity changes around bunker relay prompts.
- Reproduction: run the napplet CLI Nostr Connect path, scan/approve with the
  same remote signer that works in nsyte.

## Current Focus

- hypothesis: napplet's NIP-46 handshake differs from nsyte's working transport
  setup, not just the relay prompt/default.
- test: compare napplet connectRemoteSigner against nsyte's initiateNostrConnect
  path, then write a regression around the mismatch.
- expecting: a protocol/nostr-tools usage difference that prevents signer
  response handling.
- next_action: complete repo-level verification, reinstall the local CLI, and
  update the open PR.

## Evidence

- napplet's previous QR path used `nostr-tools` `BunkerSigner.fromURI`, whose
  QR connect resolver only accepted a response result equal to the URI secret.
- nsyte uses applesauce `NostrConnectSigner`, whose QR connect handler accepts
  either `"ack"` or the generated secret.
- Real remote signers that reply with `"ack"` therefore connect in nsyte and
  leave napplet waiting indefinitely.
- Regression coverage now includes a QR flow where the fake bunker replies with
  a signed encrypted `{"result":"ack"}` response.

## Eliminated

- Relay prompt/default handling was not the blocker after switching the default
  to `wss://bucket.coracle.social`; the failure reproduced at the signer
  handshake layer.

## Resolution

- Use applesauce `NostrConnectSigner` for QR pairing, pasted `bunker://`
  connections, stored `nbunksec` reconnection, and sign-time remote requests.
- Keep Napplet's explicit permission builder because applesauce-signers 5.2.0's
  helper enum still emits the typo `get_pubic_key` for the public-key
  permission.

## Follow-up: stored deploy hang after ack

- Symptom: `keys connect` reaches "Stored remote signer session..." but may not
  return promptly, and a later `napplet deploy` waits with no status output.
- Root cause: the QR path encoded the user signing pubkey into `nbunksec`, while
  stored reconnect needs the remote signer pubkey that sent the `ack`; stored
  reconnect also replayed the one-time QR secret and had no timeout/status line.
- Resolution: encode the remote signer pubkey in `nbunksec`, reconnect stored
  sessions without replaying the QR secret, add bounded reconnect/public-key
  waits, destroy owned pools on close, print stored-signer reconnect status, and
  re-enter Nostr Connect when an interactive deploy finds a stale stored session.
