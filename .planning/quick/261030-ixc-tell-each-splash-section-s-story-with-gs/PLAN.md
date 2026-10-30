---
status: complete
---

# Splash sections told as stories

Quick task on the existing `feat/astro-ecosystem-showcase` branch (PR #221). The user rejected the current homepage treatment: section reveals are interchangeable slide-up fades, and decorative rotations (orbit boxes, host labels, collection tickets, the mobile dock) read as unprofessional. Planning, execution and verification run inline.

## Purpose of each section, and the story its reveal tells

| Section | Purpose | Story | Reveal |
| --- | --- | --- | --- |
| Hero | Introduce the one app and the promise: same app, different surroundings | A technical figure: the app at centre, three settings named with dimension-line leaders | Headline lines rise from under a mask; leaders draw to the app in sequence; labels settle upright. Background: a field of window frames in depth. |
| 01 Start here | Get the reader to open a real app now | The collection opens: three slots deal out from behind the app, then the real apps wipe in beneath | Slot markers travel from the app to their grid columns; cards wipe up in order. Background: frames gather into a wall of windows. |
| 02 How it works | The app stays the same while the host changes; list shells | Changing hosts: desktop draws, the app docks, the phone rises, the app hops | Desktop outline wipes with its sidebar ticking in; phone masks up. Directory rows reveal as a ledger: rule draws, name and chips follow. Background: frames form a corridor the app passes through. |
| 03 Open by design | Apps and shells meet through a shared protocol | A handshake: the app asks, a pulse travels each wire, the service answers | Wires draw from the app, pulses travel to the ports and light them; contract lines draw for the two documents. Background: frames stand in a ring around the app. |
| 04 Your part in it | Invite the reader to build one of four things | The app becomes an empty canvas with room around it | Brackets open outward from the app, the grid fades in from centre, the app morphs to "Untitled idea"; paths reveal with a horizontal cursor wipe. Background: every frame collapses into one bright frame that opens to fill the view. |

## Tasks

1. Add `three` to `apps/web` and a lazily loaded `src/lib/world.ts` scene: one fixed canvas, shared rounded-frame geometry, deterministic formations per chapter, scroll-scrubbed GSAP transitions, mouse parallax on desktop, DPR cap, pause when hidden, disposal on swap. Skipped under reduced motion or without WebGL.
2. Rewrite `index.astro` figures and `showcase.css` to remove every decorative rotation and give each section the story structure above; rewrite `animations.ts` choreography per section and drop the shared generic batch reveal.
3. Verify: build, type-check, web units, showcase browser check against the production preview, desktop and mobile screenshots, reduced motion. Record evidence in SUMMARY.md, commit, push, update PR #221.

## Constraints

Keep the stage class names, docks and traveler behaviour that `scripts/check-showcase.mjs` asserts. Static markup stays complete without JavaScript. No protocol surface or package versions change.
