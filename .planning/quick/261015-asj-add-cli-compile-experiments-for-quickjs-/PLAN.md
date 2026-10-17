---
type: quick
status: complete
---

# CLI compile experiments

Add opt-in host-native compilation tasks for V8 baseline, dependency pruning, bundling, minification, disabled code cache, combined size flags, and QuickJS with and without minification. Expose every compile task through pnpm as well as Deno. Keep release builds and output paths unchanged.

Use Deno 2.9.5, whose installed help and official compile documentation expose these flags. Compile the real standalone entrypoint, measure output sizes, and execute help/version and the existing standalone integration suite where feasible. Record actual failures as experimental limitations rather than claiming successful runtime support. Document commands and output locations in the CLI README. No protocol changes.

Validate package builds, type checks, unit tests, and the AI-slop gate. Add a package changeset, commit by path, push, and open a PR.
