---
quick_id: 260703-kaa
slug: add-a-screenshot-tool-to-napplet-cli-tha
status: complete
created: "2026-07-03T12:36:20.782Z"
---

# Add napplet CLI screenshot tool

## Objective

Add a `@napplet/cli` screenshot flow that loads a napplet in `@kehto/paja`, provides a live identity by default, waits for the iframe to load, captures only the napplet iframe, saves the screenshot in a dedicated directory, and makes saved screenshots discoverable by `napplet deploy` so deploy uploads them to Blossom and includes them in the napplet event.

## Constraints

- Branch from `feat/napplet-cli` into a new PR branch.
- Preserve protocol fidelity; do not invent NIP-5D/NAP wire surface.
- No new dependencies unless the existing CLI/Paja/browser tooling cannot satisfy the requirement.
- Default identity: `npub1uac67zc9er54ln0kl6e4qp2y6ta3enfcg7ywnayshvlw9r5w6ehsqq99rx`, with override support.
- Screenshot target is the napplet iframe only, not the surrounding Paja UI.

## Plan

1. Map existing CLI command routing, deploy file discovery, Blossom upload, manifest event template generation, and current Paja invocation surfaces.
2. Add screenshot command/config primitives and tests around path/identity/default behavior.
3. Capture via Paja runtime in a browser automation path, save under a stable dedicated directory.
4. Extend deploy discovery/event generation so screenshots are uploaded and referenced in published events.
5. Run CLI-focused gates, repo gates where practical, commit, push, and open PR.

## Result

Implemented and verified. Commit/PR handled after this summary is written.
