# Quick task 261123-tpc: topic `t` tags in manifest events

Adds optional discovery topics to the napplet config, `napplet init`, the Vite plugin, and the agent skills. Each topic is published as a `["t", "<topic>"]` hashtag tag on the manifest event. NIP-5D doesn't define topics; `t` is the general Nostr hashtag tag, and the user asked for it explicitly as optional metadata outside NIP-5D. No HTML `<meta>` mapping was added, since NIP-5D §HTML Metadata for Publishing defines none for `t`.

`proof/` holds terminal renders of real CLI and plugin runs: `init --help`, the interactive wizard (including a rejected `#` entry), `deploy --dry-run` tags, and a Vite build sidecar.
