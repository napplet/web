---
"@napplet/core": minor
"@napplet/shim": minor
"@napplet/conformance": minor
"@napplet/conformance-cli": patch
---

Expose release-time NAP implementation maturity separately from upstream proposal state through `NAP_IMPLEMENTATIONS`, `getNapImplementation`, and `selectNapDomains`. The supported-only selector intersects explicit host candidates with allowed maturity levels and named opt-ins, returning exclusion reasons without granting support or permissions. All maturity levels remain subject to API changes.

The side-effect-free shim prelude accepts optional maturity policy while preserving existing explicit allowlists and legacy root-import behavior. The reference browser host applies the same resolved domain set to injection and dispatch, including direct-message attempts. Normal conformance runs retain full-domain coverage. Documentation tables and domain labels derive from the implementation catalog.
