---
"@napplet/cli": patch
---

Remove the 13-character upper bound on named napplet `d` tags. Neither NIP-5D nor
NIP-5A constrains `d` tag length, so `^[a-z0-9-]{1,13}$` was CLI-invented surface
that rejected spec-conformant napplets — `napplet deploy` now accepts any
non-empty `[a-z0-9-]` `d` tag (still rejecting trailing `-`), and `napplet deploy
--all` no longer throws on workspace folders with names longer than 13
characters.
