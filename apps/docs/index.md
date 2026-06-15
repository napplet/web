---
layout: home

hero:
  name: napplet
  text: Composable Nostr apps
  tagline: Sandboxed Nostr web applets that delegate signing, storage, and relay access to a host shell over the NIP-5D JSON envelope wire format.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: What are napplets?
      link: /guide/
    - theme: alt
      text: napplet.dev
      link: https://napplet.dev/

features:
  - title: Single-purpose by design
    details: A napplet does one thing well. The shell composes many sandboxed napplets instead of one monolithic client re-implementing feeds, DMs, profiles, and relay management.
  - title: Keys never exposed
    details: Napplets never touch signing keys, localStorage, or relay sockets directly. Everything is proxied through the shell via postMessage. No window.nostr is installed.
  - title: Browser-enforced sandbox
    details: The iframe uses allow-scripts only — no allow-same-origin. Identity is assigned at iframe creation via the unforgeable MessageEvent.source. No handshake required.
  - title: Modular NAP domains
    details: Capabilities are split into NAP domains (relay, storage, inc, identity, and more). Shells implement the domains they support; napplets gate on shell.supports().
  - title: Just a JSON envelope
    details: 'Every message is { type: "domain.action", ...payload }. A simple, standardized wire format that any shell can host and any web app can speak.'
  - title: Portable across shells
    details: Build once against the protocol. Any compatible shell — like the Kehto reference runtime — can host your napplet without changes.
---
