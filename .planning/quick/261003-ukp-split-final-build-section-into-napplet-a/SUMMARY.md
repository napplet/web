---
status: complete
---
# Two build paths in the final section

Combined the separate app-builder and shell-builder screens into one final Build section with equally prominent Build napplets and Build shells paths. Each retains all four existing tools and has a dedicated starting button. Desktop uses two columns; mobile stacks them. Existing `#runtimes` links still reach shell tooling, and mobile navigation exposes both paths. Retired layout styles and illustration animations were removed; shared tool-row motion remains.

Verification: full workspace build, type-check and unit suites passed. Showcase browser checks passed at 1440, 390 and 320px, covering two-column/stacked layout, both tool lists and CTAs, all three playable apps, no-JavaScript rendering, reduced motion and normal animation. Desktop/mobile screenshots visually reviewed. AI-slop remains 84/100 against the existing 70 gate, with no new findings. Preview rebuilt at `http://localhost:8101/#build`; included in PR #222. Only the private website changed, so no package release is required.
