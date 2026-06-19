---
quick_id: 260619-qvr
status: in_progress
created: 2026-06-19
---

# Clarify alpha status notices in bottom packages and boilerplate sections

## Scope

Make the lower landing/docs sections communicate that the napplet development
ecosystem is alpha.

## Tasks

1. Locate the page/component that renders the packages section and the boilerplate
   install section.
2. Add a prominent alpha notice near the packages section using the existing page
   visual language.
3. Add a blur-backed modal above the boilerplate install section with the exact
   notice meaning requested by the user and an "I Understand" acknowledgement
   button.
4. Verify source, build/type checks, and rendered behavior.

## Acceptance

- Packages section has an obvious alpha-status warning.
- Boilerplate install section is initially obscured by a modal/backdrop.
- Modal text includes: "The boilerplate is alpha, it could be broken, some
  tooling paths could be broken or not complete. The spec could drift".
- Modal button text is "I Understand" and dismisses the overlay.
