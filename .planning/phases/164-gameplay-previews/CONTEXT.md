# Phase 164: Gameplay previews

## User requirements

 Implement short gameplay previews across napplet, using Soyli’s capture workflow as reference. Reuse existing screenshot/Paja/Playwright tooling and `napplet deploy --zapstore`, which already publishes kind 32267.

Deliver:
- `napplet record`: interactive capture window plus timed click/keyboard recipes for agents.
- Record actual built artifact. Exclude host controls. Default 6-second silent WebM; configurable duration and viewport.
- Reuse managed browser tooling. Install/cache encoder automatically; require no global Node or FFmpeg.
- Save clip selection and artifact hash. Preserve existing files. Detect stale clips after rebuild; require replacement or deselection before publishing.
- Extend existing --zapstore publisher: upload clip through Blossom, include URL in application-event content, attach NIP-92 imeta with MIME, hash, size, dimensions, and thumbnail.
- Preserve existing cover images and static fallback. Keep recording optional.
- Add catalog playback where applicable: muted, inline, hover/focus; stop offscreen and on hidden tabs. Respect reduced motion and Save-Data.
- Update boilerplate, CLI help, docs, examples, and agent skills.

Inspect every napplet repo/package, including boilerplate and relevant Kehto/Paja consumers. Record affected/unaffected coverage; change each affected surface.

Read current canonical NIP-5D, NIP-92, and Software Applications proposal. Recheck existing app-reference proposal. Flag unresolved interoperability limits; do not invent manifest tags, NAPs, or protocol requirements. Treat recording limits as tool policy.

Verify real gameplay capture, scripted actions, stale-build detection, upload/event metadata, playback/fallback, and standalone CLI platforms. Test publication locally without broadcasting public events.

Follow AGENTS.md and GSD. Preserve unrelated WIP. Complete builds, types, relevant tests, slop gate, docs, and required changesets. Commit, push, open PRs. Report PR links, coverage, verified behavior, and remaining specification limits.
## Execution

GSD plan-phase PRD path, followed by execute-phase. Work inline under the Codex spawn restriction. Preserve original dirty checkout; use feat/gameplay-previews based on origin/main 10fd4e61. Phase 163 belongs to the separate GAMEPAD PR.
