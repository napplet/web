---
"@napplet/conformance": patch
"@napplet/conformance-cli": minor
---

Use maintained runtime bindings in the reference CLI and web host, observe namespace installation independently from subject failures, and avoid initial blank-frame load races. Custom browser hosts can supply runtime source and an already loaded HTML snapshot; the embedded fallback advertises only its implemented RESOURCE/GAMEPAD bindings.

Add headless `--manifest` input with signed-event and exact raw artifact verification before execution. Run manifest checks against the verified event, reuse its HTML snapshot in both boots, and report the actual debug sandbox setting.
