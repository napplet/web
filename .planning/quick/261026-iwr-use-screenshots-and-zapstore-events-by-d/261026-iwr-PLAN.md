---
quick_id: 261026-iwr
status: complete
---

# Default deploy screenshots and Zapstore events

Goal: `napplet deploy` captures a screenshot and publishes a kind 32267 application event by default. `--no-screenshot` and `--no-zapstore` opt out independently; `--no-zapstore` also prevents a screenshot that would have no publication destination.

1. Resolve usable default application metadata from the selected deployment when no `zapstore` object is configured. Preserve configured metadata and explicit overrides.
2. Change deploy and flag handling so capture and application publication default on; validate conflicting flags and keep dry-run behavior and cleanup intact.
3. Remove the undocumented NIP-5D `app` manifest tag coupling, since current NIP-5D does not define it. Keep kind 32267 metadata distinct from manifest fields.
4. Update focused tests, CLI help and docs, changeset, and GSD state. Run repository build, type, unit, and AI-slop gates; commit, push, and open a PR.
