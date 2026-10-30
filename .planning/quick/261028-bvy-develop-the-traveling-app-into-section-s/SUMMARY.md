---
status: complete
---

# Expanded ecosystem showcase

Delivered the six concrete requests through [PR #221](https://github.com/napplet/web/pull/221) on `feat/astro-ecosystem-showcase`: a recognizable current-release app participates in each section's GSAP reveal, changes hosts and becomes a canvas; six public shells show platforms and status; six configurable curated previews and a signed discovery app store are available. The shared theme and original archived apps remain usable.

Resynced with the actual current NIP-5D file and refreshed 44 NAP entries from upstream `5aadf1b`. All default homepage examples use direct artifact hashes; the three historical releases remain explicitly archived in the store. Some upstream source-location metadata uses unsupported `nostr://` formats; signatures are preserved and the discrepancy is flagged. Six public shell links returned 200. One extra candidate with only a private destination was removed.

Local evidence: full build 12/12, types 19/19, recursive unit suites, 20 web units, production browser checks at 1440/390/320, six playable launches and new gameplay, reverse scrolling, sustained resize/deep-link alignment, reduced motion, no-JavaScript, search/filter/empty states, signed discovery/XSS vectors, offline retry, 74 internal URLs, 44 protocol routes, and zero measured axe WCAG A/AA violations on both public routes. Real opt-in discovery reached 62 entries. Pinned quality scan: 98/100, with a low deepmerge dependency advisory reporting no available fix. No gate policy changed.

Source and screenshot evidence are in RESEARCH.md, VERIFICATION.md and `proofs/`. Current source revision `f0a27e65` has green hosted CI, conformance and quality checks; the site-link job is still building at the time of this record. The PR's live checks are authoritative for later results. Node 24 was required after the initial hosted runner selected an older Node patch below Astro's engine minimum. No production deployment, merge, local package publication, package version change or unrelated original-checkout edit was made.
