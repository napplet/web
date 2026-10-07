---
"@napplet/cli": patch
---

`napplet deploy` keeps plugin-emitted `requires` tags for domains outside the built-in NAP list instead of dropping them from the published manifest.
