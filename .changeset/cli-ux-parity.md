---
"@napplet/cli": patch
---

Improve interactive CLI deploy/init UX with guided init suggestions, hidden
Enter-based secret prompts, terminal deploy reports with NIP-19 pointers,
configured-bunker reconnects, and raw `bunker://` signing while preserving JSON
output for CI. Root-source deploys now keep local control state such as
`.napplet/config.json`, hidden files, and `node_modules` out of signed manifest
content. Relay and Blossom suggestions are now Tab-completion candidates instead
of numbered selections, and Nostr Connect asks for bunker relays separately from
deploy relays with `wss://bucket.coracle.social` as the default.
