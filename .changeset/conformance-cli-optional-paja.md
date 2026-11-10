---
"@napplet/conformance-cli": minor
---

Make `@kehto/paja` an optional peer dependency, loaded only for local `screenshot` previews. Installing the CLI no longer pulls in a second, older `@napplet/core` / `@napplet/nap` generation through Paja 0.21.x. Local directory previews now need a compatible `@kehto/paja` installed next to the CLI and fail with an install hint when it's missing; `screenshot <preview-url>` and conformance runs are unchanged.
