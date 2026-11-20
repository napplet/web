---
quick_id: 261120-x2d
status: complete
branch: feat/experimental-domains
---

# Experimental (non-NAP) domains across the toolchain — revives napplet/web#187

Spec basis, NIP-5D (nips#2303 @ f60550c3): "a NAP named `foo` owns all `foo.*` types" (§Wire Format); `R`/`O` tags name "one bare NAP domain" (§Required and Optional Capabilities); the namespace "MUST contain only the NAP domain objects the shell exposes" (§Transport). Nothing limits domains to this registry, so an explicit operator allowlist is tooling, not protocol. No domain is defined here.

#187 targeted the NIP-5A-era stack (requires/path tags, window-message routing), so this is a re-implementation on current main, stacked on #358 (advisory unknown types + --strict): core name helpers; shim extension registry with a `<domain>.*`-scoped channel (never the port), no override of NAP domains, never via install-all, prelude registerExtension before the single-use install; sdk experimentalDomain(); vite-plugin experimentalDomains (+ fixed missing `shell` caught by a new drift test); conformance validators/boot/shell/context options; conformance-cli --experimental-domain / --extension, web ?experimental=. Renamed customDomains -> experimentalDomains. #187 author credited via Co-authored-by.
