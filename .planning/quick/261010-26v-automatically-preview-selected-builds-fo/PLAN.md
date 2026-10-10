# Automatic screenshot previews

Make `deploy --screenshot` capture the selected build without a user-supplied host. Reuse Kehto Paja's published server API for a real development shell, serve the selected artifact on an ephemeral loopback port, capture its iframe, and close both servers and browser on every outcome. Retain explicit preview URLs for compatibility and the standalone screenshot command. Capture each distinct selected build once. Browser installation should happen automatically when missing.

Verify with unit tests and real Chromium using a built napplet that calls the injected runtime. Update CLI/browser runner documentation and release metadata, run repository checks and slop gate, then open a follow-up PR. Protocol sources remain the living NIP-5D and NAPs; Paja is a preview implementation, not protocol authority.
