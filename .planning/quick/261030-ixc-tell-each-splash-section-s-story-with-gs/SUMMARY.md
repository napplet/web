---
status: complete
---

# Splash sections told as stories

Commit `e2c9fb0b` on `feat/astro-ecosystem-showcase` (PR #221). The homepage's five sections each have a reveal shaped by what the section is for, and every decorative rotation is gone.

| Section | Purpose | Story and reveal |
| --- | --- | --- |
| Hero | Introduce the one app and the promise | Headline lines rise from under a mask; upright labels draw dimension leaders to the app, replacing tilted orbit boxes and rotated labels. |
| 01 Start here | Get people to open a real app now | Three slots deal out from behind the app to the card columns with drop lines; cards wipe up in order with the preview settling from a slight zoom. The rotated tickets and giant word are gone. |
| 02 How it works | The app stays, the host changes | Desktop wipes on with its chrome ticking in, the phone rises, the app hops. Directory rows reveal as a ledger: each rule draws before the name, chips and source link. |
| 03 Open by design | Apps and shells meet through a protocol | Wires draw from the app, a pulse travels each one along its path and lights the service it reaches. Contract lines draw for NIP-5D and the NAP directory. |
| 04 Your part in it | Invite the reader to build | Brackets open outward from the app, the blueprint grid reaches the edges from the centre, the app morphs to an untitled canvas, and path headings wipe horizontally. |

Behind the page a lazily loaded three.js scene (`src/lib/world.ts`) draws thirty additive wireframe window frames that form a new figure as each chapter arrives: a scattered field, a wall of windows, a corridor, a ring, and one frame that opens to fill the view. Transitions are scroll-scrubbed with explicit from/to poses so deep links and reverse scrolling resolve correctly. The scene loads only with `prefers-reduced-motion: no-preference` and a WebGL context, caps device pixel ratio at 1.5, dims on narrow viewports, pauses when the tab is hidden, and disposes on navigation. The chunk is 126 KB gzipped and is never requested on the static paths. The small-screen dock reveal no longer rotates.

## Verification

- `pnpm build`: 12/12 tasks. `pnpm type-check`: 19/19 tasks. Web units: 20 passed; core 35, nap 197.
- `scripts/check-showcase.mjs` against the production preview: layout, three playable releases, close, focus, failure and retry at 1440, 390 and 320; static SEO, no-JavaScript, explainer and motion checks passed, including traveler placement in all five stages, reverse scrolling, resize refresh, deep-link alignment and the reduced-motion switch restoring static artwork. No page errors.
- Headless browser review with motion enabled at 1440 and 390 across all sections; brightness of the field was tuned down after the first pass so frames never compete with headlines.
- Pinned `aislop@0.12.0` scan: 98/100, zero source findings after splitting the world mount into helpers; the remaining warning is the pre-existing deepmerge advisory.

## Observed failures outside this change

- `@napplet/docs` build failed locally with a dangling `apps/docs/node_modules/vue` symlink that VitePress left pointing at a Vue version no longer in the store. Removing the link fixed the build; no source changed.
- One CLI unit test (`debug validates --format before loading config`) fails only while an untracked local `packages/cli/.napplet/config.json` exists in the tree. With that file set aside, 239 pass. The file was left in place untouched.
