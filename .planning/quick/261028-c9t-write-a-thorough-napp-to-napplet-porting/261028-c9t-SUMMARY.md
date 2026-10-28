---
quick_id: 261028-c9t
status: complete
---

# NAPP porting skill

Delivered `skills/napplet-port-napp/SKILL.md` and two task-specific migration references. The skill continues from source inventory through implementation, artifact/metadata validation and runtime parity evidence; it does not stop at a handoff. The generic port/make skills route nostrapps sources to it, and public docs show installation and a complete-port prompt. Implementation: `5ac63f25`. PR: https://github.com/napplet/web/pull/270.

## Completion evidence

| Requirement | Evidence |
| --- | --- |
| Address actual NAPP source contracts | Read live eskema/nostrapps NAPP.md and referenced typings; source-specific tables cover launcher/store/signing/UI/actions/storage/assets/metadata, including source-only behavior with no automatic equivalent. |
| Follow NIP-5D + NAPs | Read actual 5D.md at PR 2303 head `5560820fa4f37f45b8ab742a11aeb3001b17dc67`, merged NAP documents and relevant proposal heads. Guidance explicitly defers to live canonical documents and separates protocol/package/runtime gaps; no local specification snapshot. |
| Support a complete port in one request | Entrypoint requires implementation, preserves essential flows, coordinates available companion skills or their maintained sources, specifies parity scenarios and refuses to count removed features as completion. |
| Surface semantic migration traps | Independent decision-level forward-test covered view:0 delivery, user-search return values, per-author/kind sync limits, global-store subscriptions, private mute mutation, close-window storage, UI bootstrap and SVG icon. Added explicit private LISTS visibility and no-guaranteed-close-erasure guidance; corrected malformed table cells. No further semantic omissions demonstrated. This evaluates decisions, not a built application. |
| Discoverable, consistent skill package | Skill-creator validator passed; all 11 skill-contract checks passed; skills CLI lists `napplet-port-napp`; local references and Markdown table/whitespace checks passed; all 25 external URLs returned HTTP 200. README, public skill guide, generic entrypoints and catalog updated together. |
| Repository verification | `pnpm build`: 12/12 tasks including docs and standalone CLI; `pnpm type-check`: 19/19; `pnpm -r test:unit`: all participating workspaces pass (468 Vitest cases plus Node tests). |
| Quality gate | Pinned aislop 0.12.0: 98/100, no errors, one existing low-severity deepmerge dependency advisory with no available fix. All non-security engines have zero findings. Passes workflow minimum 70; no rule changes/suppression. |
| Worktree and delivery | Isolated `/Users/sandwich/.worktrees/napplet/napp-port-skill`, branch `docs/napp-port-skill`, pushed and opened PR #270. Original checkout's package.json and untracked WIP untouched. |

## Scope and limits

No app was requested for implementation in this task; the scenario evaluation is not represented as a production port or runtime proof. No protocol/package implementation changed, so no changeset is warranted. No app publication, package release or merge performed. A later real port still needs source-specific runtime parity evidence as the skill describes.
