---
"@napplet/cli": minor
"@napplet/conformance": minor
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/sdk": minor
"@napplet/vite-plugin": minor
---

Replace retired numbered convention contracts with opaque archetype conventions
through the public Core, NAP, SDK, Vite, CLI, and conformance surfaces. NAP-INC
now exposes `emit(topic, payload?)` and transposes queried convention URIs only
at outbound emit time before exact stable-topic routing.
