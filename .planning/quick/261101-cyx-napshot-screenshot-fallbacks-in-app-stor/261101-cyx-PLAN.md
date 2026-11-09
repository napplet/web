---
quick_id: 261101-cyx
slug: napshot-screenshot-fallbacks-in-app-stor
date: 2026-11-01
mode: quick
---

# Napshot screenshot fallbacks in the app store

Show trusted [Napshot](https://github.com/napplet/napshot) previews on `/apps/` discovered release cards whose manifest declares no usable author screenshot, following the `napshot-shell` skill. Napshot labels are an external NIP-32 (kind 1985, `#screenshot` namespace) annotation profile owned by napplet/napshot. They are not NIP-5D or NAP surface: this is a display-only addition to the website, and it adds nothing to what a shell or napplet must do.

## Tasks

1. **Label verification (`apps/web/src/lib/napshot.ts`).** Verify the event id and signature, kind 1985, signer membership in a non-empty trusted list, the exact `e` target, matching `a`/`p`, the `L` namespace, and the `l` hash. Parse a strict `screenshot` tag: exactly one lowercase `x`, `m image/png`, positive `dim` and `size`, and no duplicate fields. Validate `server` URLs: HTTPS only, no credentials, no localhost or private-IP literals, deduplicated and bounded. Choose deterministically by signer preference, then newest, then lowest id. Attach the label only to root/named entries without author screenshots, never to snapshots.
2. **Bounded verified fetch (`media.ts`).** Add a timeout and a streaming size limit, validate the redirect destination, and check decoded dimensions against `dim`. Keep the per-mirror fallback.
3. **Card and hydration (`card.ts`, `store.ts`).** Pass the Napshot media in `data-media`, render it when no author screenshot exists, label the source "Napshot preview", and give the image accessible text.
4. **Snapshot and live discovery.** `refresh-showcase-apps.mjs` saves trusted labels for the saved manifests under `labels`. Live discovery queries `#e` labels from the trusted signers for newly found manifests. The trusted signers are configured in `discovery.json` (`screenshotLabelers`).
5. **Tests and proof.** Unit fixtures cover every proof case the skill lists. Extend `check-app-store.mjs` with a routed label and Blossom mirror. Refresh the snapshot, then take before/after screenshots.
6. **Docs.** Update `apps/web/README.md` and the "About this collection" copy.
