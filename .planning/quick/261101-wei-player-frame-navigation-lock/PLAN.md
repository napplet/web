---
quick_id: 261101-wei
slug: player-frame-navigation-lock
date: 2026-11-01
status: complete
---

# Lock the napplet.run preview frame to its verified document

After #304 the player detects a second hello, a window-level message, a second `load` or the port closing (NIP-5D Identity), the same signals the updated kehto shell (#378, `nip5d-transport.ts`) uses. It still could not see a napplet navigating before its own first `load`: only the replacement fires `load`, and Chromium has no MessagePort `close` event. A control run with no page policy confirmed that a `data:` or `blob:` document with script then runs in the preview, in Chromium and in Firefox.

Fix: the site layout sets `Content-Security-Policy: frame-src 'none'`, which browsers check for every navigation of a child frame, including one the frame starts. An unfetched `srcdoc` document still loads. The player refuses to run without the policy (fail closed). This is site policy for napplet.run's own page and not napplet protocol surface: no message, tag or bootstrap behaviour is added.
