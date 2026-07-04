---
"@napplet/boilerplate": patch
"@napplet/skills": patch
---

Add agent-focused napplet benchmarking guidance. The package benchmark command
now runs Codex against a default frozen one-shot prompt, scores the produced
candidate, supports stable output paths and prompt/candidate overrides, records
agent timeout/failure as workflow evidence, and reports implementation accuracy,
completeness, and detected bugs instead of measuring scaffold or skill
installation success.
