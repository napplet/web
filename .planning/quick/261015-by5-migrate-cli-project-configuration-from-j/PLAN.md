---
status: complete
---

# YAML project configuration and mandatory migration

Use YAML for `.napplet/config.yaml`; accept explicit `.yaml` and `.yml` paths. The user explicitly selected YAML because it preserves the existing JSON data model and supports comments. Use the dependency already present in the repository lockfile, yaml 2.9.1, whose Document API preserves comments on unchanged values. The graph index has no CLI nodes; reader/writer discovery therefore uses source searches.

## Acceptance and implementation plan

1. Read and write YAML through one storage module, with duplicate-key/syntax/root-shape validation and comment-preserving updates. Preserve the current configuration semantics. New init writes YAML only. JSON machine output and signed-event files remain JSON.
2. Detect default and explicit legacy JSON configurations before config-consuming command side effects. Interactive use asks for migration consent. No/empty input terminates with `Cannot continue without migrating` and a nonzero exit. CI, redirected input, and `-i` never silently approve; an explicit `--migrate-config` flag permits automation. Help/version/guide remain accessible.
3. Validate the old configuration, preserve its exact bytes in `.json.bak`, create YAML without overwriting existing files, then remove the active JSON path. Preserve all raw configuration fields during conversion. Refuse conflicting output/backup files. Recover safely from an interrupted migration when the matching backup and equivalent YAML already exist. Update explicit `--config` paths for the same invocation. Public readers/writers must reject an unmigrated JSON config instead of bypassing consent.
4. Cover acceptance/refusal/cancellation, malformed JSON/YAML, backup conflicts, repeated/partial migration, custom paths, comments, values requiring YAML quoting, and command side-effect prevention. Update existing fixtures and standalone tests to use actual YAML. Exercise the compiled CLI interactively and non-interactively, including the QuickJS/pruning variant selected in the preceding work.
5. Update every active config reference and example in docs, tutorials, skills, tests, and boilerplate-related flows. Keep package/build metadata JSON. Add a minor changeset for the changed config compatibility contract.
6. Run build, types, recursive unit tests, tutorial/skills/workflow checks as affected, and the AI-slop gate. Commit, push, and open a dedicated PR. Audit each acceptance condition against current evidence before completing the goal.

## Migration boundaries

This is CLI file storage, not protocol surface. No NIP-5D/NAP behavior changes. Original workspace WIP and open PRs #248/#249 remain separate; this branch starts from current origin/main. The JSON backup provides rollback by renaming it back for an older CLI. Never silently retain JSON as a supported active configuration format.
