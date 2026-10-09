---
"@napplet/vite-plugin": minor
"@napplet/cli": minor
---

Preserve NIP-5D publishing metadata in the built HTML head before computing its artifact hash. Resolve plugin options, author declarations and inferred capabilities consistently; add icon byte input while retaining hash-only callers.

Recover current-format deploy metadata and supported data-URL icon bytes from standalone HTML without a sidecar. Upload the same decoded icon bytes, respect explicit deployment overrides and event-kind restrictions, and preserve legacy-format behavior. Embedded metadata changes now change the built artifact hash.

Validate configured and recovered Blossom upload destinations before signing manifests or uploading, with clear errors for missing values and non-origin URLs.
