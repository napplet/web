---
status: complete
---
# Simple viewport-height develop section

Replaced the detailed build paths with two concise panels and exactly two links: napplet agent skills and the Kehto repository. Kehto's overview names its runtime, browser integration, service handlers and permissions. Removed tool lists and the closing callout; preserved app/shell anchors. The section uses a viewport minimum height, responsive spacing and natural growth for enlarged text. Its anchor offset is corrected so opening `#build` keeps both links visible.

Verified exact viewport height without horizontal overflow at 1440×900, 390×844, 320×568 and 844×390. Both links remain fully visible after anchor navigation. Desktop/mobile screenshots reviewed. Workspace build, type-check, unit tests and showcase browser suite passed, including all three playable releases, no-JavaScript rendering and motion. AI-slop remains 84/100 against the existing 70 gate. Preview rebuilt at `http://localhost:8101/#build`; PR #222 updated. No shipped package changed.
