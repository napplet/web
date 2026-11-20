---
'@napplet/cli': patch
'@napplet/conformance': patch
'@napplet/conformance-cli': patch
'@napplet/core': patch
'@napplet/nap': patch
'@napplet/sdk': patch
'@napplet/shim': patch
'@napplet/vite-plugin': patch
---

Point the npm `repository` metadata at the public repository, `https://github.com/napplet/web`. The previous URL returned 404, so the repository link on npm and in tooling that follows package metadata was broken.
