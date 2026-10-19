# NAP-INTENT cascade summary

Implemented in c9f2c8e1 on `fix/nap-intent-amendments`, based on origin/main 6079477d. The original workspace contained unrelated tooling work, so execution used an isolated worktree and left those changes untouched.

INTENT calls now derive normalized requests from convention URIs, return immediate acceptance results, retain asynchronous deliveries until listener registration, extract bare naddr recommendations, and expose opaque installed-catalog identifiers with z/i parameter contracts. Existing named helpers and IntentOpenOptions remain exported with the amended signatures. The reference shell queues target delivery independently of the originating request and attests the source catalog identifier.

Optional NAP-SHELL readiness is exposed through core, NAP, SDK, and runtime exports. The receiver is installed before its one readiness signal; retained environments do not grant capabilities or gate other domain calls. INC provenance uses authenticated endpoint identifiers. THEME and IDENTITY messages are routed only while their domains are exposed, with parent-source validation retained.

READMEs, docs, skills, tests, npm/JSR/Deno metadata, and tutorial versions were updated together. Changesets produced core/nap 0.33.0, sdk 0.29.0, shim 0.31.0, conformance 0.19.0, CLI 0.8.1, and the dependent conformance-cli patch. Historical changelog entries were preserved. Publishing remains delegated to main-branch workflows.

The full slop scan initially exposed existing dependency and complexity findings. Changesets 3.0.3 and patched transitive dependency constraints eliminated the advisories; existing CLI and release helpers were extracted while preserving exports and behavior. The final full scan is 100 with zero diagnostics, without advisory exceptions or rule disables.

The canonical NAP-INTENT amendment contains conflicting editorial descriptions of fragments and explicit handler identifiers. The implementation follows the published web projection for handlerHint and retains opaque installed-catalog selection semantics. This conflict is surfaced for reviewers in the PR; the implementation does not introduce new wire surface.
