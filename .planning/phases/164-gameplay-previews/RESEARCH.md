# Research (non-normative)

- Canonical NIP-5D PR 2303 head 020cb8b33a9e4c6b8ca4b2f9d0ed0a67843b68f7: https://github.com/dskvr/nips/blob/020cb8b33a9e4c6b8ca4b2f9d0ed0a67843b68f7/5D.md. Capture through the existing opaque Paja iframe; no new runtime messages or metadata in executable HTML.
- NIP-92: https://github.com/nostr-protocol/nips/blob/master/92.md. Attach the video URL in event content and use matching imeta entries with NIP-94 fields.
- Software Applications proposal PR 1336 head 9d959cd9e238b6ccb11cd7feeb066567860181d0: https://github.com/franzaps/nips/blob/9d959cd9e238b6ccb11cd7feeb066567860181d0/82.md. Extend the existing optional kind-32267 publisher.
- Existing app reference remains pending: https://github.com/dskvr/nips/pull/11 (open, unmerged, rechecked 2026-10-13). Retain its explicit proposal label. Video adds no new manifest fields.
- Soyli uses Playwright screencast, timed mouse/keyboard input, and an interactive capture window. https://github.com/zeSchlausKwab/napplet-soy/blob/main/docs/PREVIEWS.md. Implement against our own runner; no copied protocol or publication rules.
- Current napplet screenshot runner already hosts frozen artifact bytes in Paja. Its Playwright dependency supports screencast. Install matching Chromium and FFmpeg in the existing private cache.
- Local capture policy: silent WebM, six seconds by default, bounded duration/viewport/actions. These are authoring controls, not conformance requirements.

## Plan review

Every requested behavior has an implementation and verification task below. No new NAP, service, generic recorder framework, or system executable requirement. Inspect all repositories before finalizing catalog applicability. Test public publication only with loopback services and disposable keys.
