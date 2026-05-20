---
'@napplet/nub': patch
---

Fix the package publish path so `@napplet/nub` tarballs resolve the internal `@napplet/core` dependency to a semver range instead of leaking the workspace protocol.
