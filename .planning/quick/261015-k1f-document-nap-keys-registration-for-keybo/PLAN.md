---
status: complete
---

# Register keyboard actions for compatibility

Add the user's authoring recommendation: for maximum compatibility, register keyboard-bound actions through NAP-KEYS, including app-local shortcuts and game controls. Keep this explicitly non-normative and defer to the living [NAP-KEYS proposal](https://github.com/napplet/naps/pull/9), whose current head was read before editing. Preserve optional-domain gating, ordinary text input, and the shell's ownership of key assignments. No protocol or SDK behavior changes.

1. Update the make, design, build, SDK, port, and test skills at their existing keyboard/workflow integration points. Include shortcuts and games; keep the SDK example as the implementation reference.
2. Update the agent-skills guide and existing skill contracts so this recommendation remains visible throughout the workflow.
3. Run skills/onboarding/link checks, the required build/type/unit gates, and the AI-slop scan. Commit explicit task paths, push, and open a PR.

Use an isolated worktree on `docs/skills-keyboard-actions` from current `origin/main`. Leave the original checkout's unrelated package/lockfile WIP untouched. No changeset is needed because no package output changes.
