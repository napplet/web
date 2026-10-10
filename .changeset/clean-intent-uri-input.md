---
"@napplet/cli": patch
"@napplet/boilerplate": patch
---

Accept queryless convention URIs such as `napplet:note/open` directly in CLI archetype input and JSON metadata. Derive the role from the URI, preserve existing object configs and legacy CLI input, and correct setup prompts, reports, and documentation.
