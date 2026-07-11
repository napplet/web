# Init wizard polish

## Problem

`napplet init` is interactive, but it can sit silently while fetching live
suggestions before the first prompt, live NIP-66 suggestions can be noisy, and
the completion report reads like a raw config dump rather than a clear success
summary.

## Target

- Show visible status while discovering relay and Blossom suggestions.
- Prefer known-good default deploy relays, then append live NIP-66 suggestions.
- Keep live suggestion discovery best-effort and non-blocking.
- Render init completion with a concise project summary and next command.
- Preserve non-interactive config creation behavior.

## Verification

- Unit coverage for relay suggestion ordering and init report text.
- TTY smoke in a throwaway repo.
- CLI check/test/lint plus root gates before pushing.
