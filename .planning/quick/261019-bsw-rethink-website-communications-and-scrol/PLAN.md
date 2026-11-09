---
status: complete
---

# Website and communications redesign

## Scope and workflow

Continue PR #221 on `feat/astro-ecosystem-showcase`, based on its verified remote head `df379da5`. The original checkout's CLI WIP is unrelated and remains untouched. GSD quick research/plan/execute/verify stages run inline. This is a substantial redesign within the existing website concern, not a replacement project. Implementation and verification are complete; see SUMMARY.md and VERIFICATION.md.

## Acceptance contract

- Research the living protocol, existing apps and shells, audience journeys, and relevant editorial/interaction precedents. Record sources and distinguish observed facts from design judgment.
- Serve all six audiences in the user's brief: experienced ecosystem developers, curious web developers, shell builders, app builders, service builders, and tool builders. Group by task rather than familiarity; provide a fast path to documentation and protocol from the header.
- Homepage visible and accessible copy contains the word Nostr exactly once, in a definition below the first viewport. No occurrence in hero illustration, metadata, navigation, image descriptions, or other homepage copy. Canonical link URLs are retained intact. Detailed documentation and upstream protocol text remain separate destinations.
- Show real runnable napplets and real shells, with accurate provenance and current destinations. Do not imply universal compatibility: available capabilities vary by shell.
- Preserve technical material at the explainer/docs/protocol destinations, correcting stale claims encountered in changed surfaces. Link prominently to the protocol directory and living canonical sources.
- Produce restrained, specific copy and a minimalist visual system retaining the existing palette. Avoid neon/glitch/terminal decoration, generic promises, repeated card grids, and sales language.
- Use GSAP for section-specific reveals and a persistent visual element whose meaning develops during scrolling. Support reduced motion, no JavaScript, keyboard navigation, small screens, and zoom.
- Verify rendered desktop and mobile views, actual animations and all launch paths, no-JS/reduced-motion, accessibility, metadata, links, and literal deployment artifact. Required build/type/unit and AI-slop gates pass; document any pre-existing failures precisely.
- Commit tested checkpoints, push changes to the existing PR, update its description to the final scope, inspect CI. No local package publishing. Do not mark the thread goal complete until every item has direct evidence.

## Working creative direction

“Apps that travel.” A compact app-shaped frame is the persistent visual subject: independent app → hosted app → capabilities → builder's blank canvas. It remains recognizable across sections and does not cover reading or controls. A narrow chapter rail retains orientation throughout; the frame's movement has a different purpose at each section. Normal document scrolling remains in control.

Proposed sequence: opening promise → real apps → plain-language definition and real shells → protocol access → four build paths. The page earns technical explanation through a concrete example before introducing terminology. Use generous negative space, sharp typography and restrained accent strokes; remove redundant promotional captions.

## Execution sequence

1. Finish research and source audit. Resolve stale preview manifests/verification against current NIP-5D before representing them as current releases. Never re-sign another author's event or loosen validation to keep old fixtures green.
2. Draft and review the complete homepage copy, metadata, illustrations, labels and four builder paths. Confirm targets exist and are useful to each audience.
3. Implement the new layout and persistent frame with GSAP; retain working launch interaction and protocol directory.
4. Browser-review desktop, mobile, scroll transitions, focus, reduced-motion and no-JS. Revise based on rendered evidence. Add meaningful content/behavior regression checks.
5. Run required gates, audit claims and old strings, update docs and PR, and inspect CI. Record evidence in VERIFICATION.md and SUMMARY.md.

## Current evidence / next action

The local showcase worktree was clean and has been fast-forwarded to the PR's newer commit. Remote head was confirmed through the GitHub API. SSH fetch stalled; its exact process was terminated after inspecting the live process. Use HTTPS transport for subsequent fetch/push if necessary. The commit already existed in the shared object database, so fast-forward required no network workaround.

Completed: research, copy/layout, persistent motion, archive disclosure, current protocol references, responsive/accessibility/browser checks, full local gates, main integration, push and PR update. All four hosted checks passed on c0f588eb. The earlier migration idea was revised based on live evidence: preserved signed historical previews are explicitly archived and isolated from current-protocol validation. See RESEARCH.md for rationale and VERIFICATION.md for evidence.
