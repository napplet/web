---
"@napplet/vite-plugin": patch
---

Emit explicit `requires` domains as declared instead of silently dropping ones outside the built-in NAP list. Unknown explicit domains now produce a build warning. Inference from source still only recognizes known domains.
