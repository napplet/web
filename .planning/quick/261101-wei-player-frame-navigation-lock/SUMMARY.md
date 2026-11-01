---
quick_id: 261101-wei
status: complete
date: 2026-11-01
---

# Summary

Added `frame-src 'none'` to the SiteLayout head via `FRAME_POLICY`, a fail-closed `hasFramePolicy` check in the player, tests and README.

Verification on the built site (the served meta CSP), in Chromium, Firefox and WebKit:
- A navigation before the first load (`data:` or `blob:` with script, or `https:`) is blocked in all three; injected script never runs.
- A navigation or reload after load is blocked or caught, and the frame is removed.
- A benign napplet stays up, and the three curated releases play in all three engines with no CSP console errors.
- Removing the policy makes the player refuse to run.

Web tests pass (65), `astro check` reports 0 errors, aislop is at 98/100 (baseline).
