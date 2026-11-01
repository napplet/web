---
"@napplet/cli": minor
---

Add `--proxy <url>` to `deploy`, `init` and `keys connect`, routing Blossom uploads, relay publishing, `init` suggestions and remote-signer (NIP-46) relay sessions, including their relay information documents, through an `http://`, `https://`, `socks5://` or `socks5h://` proxy. Embedded proxy credentials are never printed, the deploy plan names the proxy in use, and other commands reject the flag.
