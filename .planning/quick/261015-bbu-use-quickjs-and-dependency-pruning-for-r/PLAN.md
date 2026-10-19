---
status: complete
---

# Release QuickJS binaries with dependency pruning

Promote the user-selected QuickJS and dependency-pruning flags into all five existing CLI release tasks. Pin the tested Deno 2.9.5 compiler in release and standalone smoke workflows. Preserve artifact names and the experimental comparison tasks. Ensure failed platform compilation prevents partial release uploads. Extend workflow contracts to protect the compiler selection and release gate, and update package documentation and the existing changeset.

Validate all five cross-compiles, native standalone integration, build/type/unit/workflow checks, and the AI-slop gate. Push the existing PR branch and verify the five native platform smoke jobs. Update PR #249's description while preserving its scenario/size table. No merge or release publication is part of this task.
