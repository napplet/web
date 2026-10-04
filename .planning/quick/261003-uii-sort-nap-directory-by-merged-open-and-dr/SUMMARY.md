---
status: complete
---
# Directory status ordering

The directory now renders Merged, Open PR, then Draft PR, alphabetically by NAP ID within each group. Sorting is applied before static rendering; filters retain that order and no JavaScript is required. Documentation updated. Rebuilt the assembled preview at `http://localhost:8101/protocol/`.

Verification: browser assertions passed for the complete status sequence, alphabetical order within every group, proposal filtering and JavaScript-disabled rendering. Workspace build, type-check and unit suites passed; all 38 detail-page artifact checks passed. AI-slop remains 84/100 against the existing 70 gate. Change included in PR #222.
