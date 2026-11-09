---
quick_id: 261101-vx0
status: complete
date: 2026-11-01
---

# Summary

Done as planned. Verification: web unit tests pass (63), `astro check` reports 0 errors, the site builds, aislop is at 98/100 (baseline). Chromium 149 checks on the bundled binding and bootstrap: navigating after load, reloading and posting at window level each remove the frame, and a benign napplet stays up. On the built site, all three curated releases play with the hello in their srcdoc, with no false teardown.

Spec gap, flagged rather than filled: a navigation that starts before the verified srcdoc document's `load` yields only one `load`, and Chromium has no MessagePort `close` event. None of NIP-5D's replacement evidence fires, so the preview keeps showing the replacement. It has no port and no grants.
