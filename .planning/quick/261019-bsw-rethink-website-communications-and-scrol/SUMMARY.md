---
status: complete
---

# Website and communications redesign

Continued the existing Astro showcase PR, [#221](https://github.com/napplet/web/pull/221). The homepage now opens with “Apps that travel,” shows real playable archived apps and real shells, introduces the network exactly once below the fold, and routes app, shell, service and tool builders to useful next steps. Manual and agent-assisted app building remain distinct choices. Technical explanations live in the preserved explainer, docs and the refreshed 44-entry protocol directory.

The minimalist aubergine design uses restrained surfaces and large typography. A single app glyph travels from the hero to a persistent chapter rail, becoming hosted, connected and unfinished as visitors scroll. GSAP sequences reflect section context. Reduced-motion, no-JavaScript, mobile, resize and reverse-scroll paths were verified. Matching metadata and a reproducible social card complete the communications change.

Research found historical manifests in all three curated releases. Their original signatures and bytes are preserved, the archive status is visible, and the private historical adapter is explicitly separate from current-protocol validation. The obsolete homepage dependency claim and aggregate-based runtime identity map were removed. No public package output changed and no changeset is needed.

Validation: full build/type/unit/test commands pass; browser checks at 1440/390/320; zero automated WCAG A/AA violations at tested sizes; 73 internal links resolve; current protocol routes and no-JS navigation pass. Hosted CI, conformance, link/browser and quality scans pass at c0f588eb; hosted quality score is 97/100 with the existing threshold unchanged. Requirement evidence and limits are in VERIFICATION.md.

Main integration is committed, the branch is pushed, and unrelated CLI WIP in the original checkout is untouched. This ships a reviewable PR, not a production deployment. Creative quality is supported by copy and rendered visual review rather than a claim of measured audience preference.
