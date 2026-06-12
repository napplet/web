# Shell Resource Policy Checklist

> Shell-implementer guide for v0.28.0+ napplet hosts implementing the resource NAP.
> Normative wire shape and MUST/SHOULD language live in [NAP-RESOURCE](https://github.com/napplet/naps); this document is a deployment checklist.

## Status

This is a non-normative implementer's guide. The normative spec is **NAP-RESOURCE** in the `napplet/naps` repo. Shell hosts MUST implement the MUSTs in NAP-RESOURCE; this document enumerates the concrete defaults and decisions a deployer needs to make.

## Why this exists

The resource NAP makes the host shell the sole network-fetch path on behalf of every sandboxed napplet. The shell-as-fetch-proxy model is an irreducible attack surface: a naively-implemented shell becomes an SSRF gadget that can probe internal addresses, exfiltrate cloud-metadata credentials, or scan the deployer's intranet on behalf of an attacker-supplied URL. NAP-RESOURCE locks the protocol-level MUSTs needed to neutralize this; this checklist makes the operator-visible decisions explicit.

Shells that violate any of the MUSTs below are non-conformant and SHOULD NOT be deployed in adversarial contexts.


## Private-IP Block List (MUST, at DNS-resolution time)

The single most important policy. Reject URLs whose **resolved IP** falls in any blocked range. Check happens **after** the DNS resolver returns an address and **before** the HTTP connection is opened. Each redirect hop is re-validated independently.

URL-parse-time checks (looking at the literal hostname) are NOT sufficient — an attacker-controlled DNS record can resolve `attacker.example.com` to `127.0.0.1` and bypass any naive check. DNS pinning to the validated address defeats DNS-rebinding and TOCTOU attacks.

### Required ranges

- [ ] `10.0.0.0/8` — RFC1918 private IPv4
- [ ] `172.16.0.0/12` — RFC1918 private IPv4
- [ ] `192.168.0.0/16` — RFC1918 private IPv4
- [ ] `127.0.0.0/8` — IPv4 loopback
- [ ] `::1/128` — IPv6 loopback
- [ ] `169.254.0.0/16` — IPv4 link-local
- [ ] `fe80::/10` — IPv6 link-local
- [ ] `fc00::/7` — IPv6 unique-local
- [ ] `169.254.169.254` (singleton) — Cloud metadata service (AWS, GCP, Azure, DigitalOcean, etc.)

### Implementation requirements

- [ ] Validation runs **after** DNS resolves to an IP, **before** the TCP connection is opened
- [ ] Each redirect hop is re-validated independently against the same list
- [ ] Failed validation emits `code: "blocked-by-policy"` with an error string identifying the matching range (so deployers can debug policy)
- [ ] Additional addresses MAY be allowed behind explicit shell-administrator policy (enterprise on-prem services), but the default for community-deployed shells MUST be restrictive


## Sidecar Pre-Resolution (default OFF)

The NAP-RELAY amendment adds an optional `resources?: ResourceSidecarEntry[]` field on `relay.event` envelopes. When the shell pre-fetches resources referenced by an event and ships the bytes alongside the event, the napplet's subsequent `resource.bytes(url)` calls resolve from cache without a postMessage round-trip.

### Privacy rationale (why default OFF)

Pre-fetching reveals user activity to upstream hosts before the user has chosen to render the event. An avatar URL on every event in a 1000-event timeline becomes 1000 HTTP requests, each one a fingerprint visible to the upstream host operator. Default OFF preserves the user's "I haven't rendered this yet" semantic.

### Checklist

- [ ] Sidecar emission defaults to **OFF** (no pre-resolution unless explicitly opted in)
- [ ] Opt-in is per **shell deployment policy** — not a per-napplet capability the napplet can negotiate
- [ ] Opt-in SHOULD be scoped by a **per-event-kind allowlist** (e.g., enable for kind 0 metadata only; do not pre-fetch resources from arbitrary user-content kinds)
- [ ] Sidecar bytes obey the **same policy** as direct `resource.bytes(url)` calls (private-IP block, MIME byte-sniffing, size cap, SVG rasterization)
- [ ] The `mime` field on each sidecar entry is shell-classified by byte-sniffing — **never** populated from the upstream `Content-Type` header
- [ ] SVG entries appearing in a sidecar are rasterized to PNG/WebP **before** being placed on the wire (the sidecar is not a bypass for SVG rasterization)
- [ ] Operators document any deviation from default-OFF in the shell's user-facing privacy notice


## SVG Rasterization Caps (MUST)

`image/svg+xml` is a parseable XML execution surface — `<script>`, `<foreignObject>`, `<image href>` external references, `<use href>` recursion, DOCTYPE entity expansion (the "billion laughs" pattern), `@font-face src:` URLs. Delivering raw SVG bytes to a sandboxed napplet recreates every attack surface the sandbox was designed to eliminate.

### Required behavior

- [ ] When the byte-sniffer identifies a fetched resource as `image/svg+xml`, the shell rasterizes it to a bitmap (PNG or WebP) **before** delivery
- [ ] The `mime` field on the result envelope for any SVG-source-input is `image/png` or `image/webp` — **never** `image/svg+xml`
- [ ] The rasterizer runs in a **sandboxed Worker** with **no network** access (no `XMLHttpRequest`, no `fetch`, no `WebSocket`, no `EventSource`, no `<img>` external `href` resolution, no `<use href>` external resolution, no `@font-face src:` resolution, no DOCTYPE entity URL resolution)

### Recommended caps (SHOULD, all enforced together)

| Cap | Recommended default | On exceed |
|-----|---------------------|-----------|
| Max input bytes | **5 MiB** | `code: "too-large"` |
| Max output dimensions | **4096 × 4096 pixels** | `code: "too-large"` |
| Wall-clock rasterization budget | **2 seconds** | `code: "timeout"` |

All three caps mitigate distinct attacks:
- Input cap → billion-laughs entity expansion is bounded
- Output cap → recursive-`<use>` rendering bombs are bounded
- Wall-clock cap → `<foreignObject>` script-driven CPU exhaustion is bounded

Relaxing any one cap undermines the others.


## MIME Byte-Sniffing Allowlist (MUST)

The upstream `Content-Type` header is attacker-controlled. A content host can declare `text/html` for what is actually `image/png` (or vice-versa) and coerce a napplet into a confused-render attack.

### Required behavior

- [ ] Classify response bytes via a byte-sniffing strategy ([WHATWG MIME Sniffing Standard](https://mimesniff.spec.whatwg.org/) or equivalent)
- [ ] **Never** pass through the upstream `Content-Type` header to the napplet
- [ ] Enforce a **scheme-appropriate MIME allowlist**; bytes whose sniffed MIME falls outside the allowlist are rejected with `code: "blocked-by-policy"`

### Recommended baseline allowlist (image-rendering shells)

- [ ] `image/png`
- [ ] `image/jpeg`
- [ ] `image/webp`
- [ ] `image/gif`
- [ ] `image/svg+xml` — only acceptable as **input** to the rasterizer; **never** delivered to the napplet as `image/svg+xml`

Shells delivering non-image bytes (e.g., `application/json` for `nostr:` resolution) extend the allowlist per scheme. Maintain one allowlist per scheme rather than a global union — the threat model differs per scheme.


## Redirect Chain Limits (SHOULD, with per-hop re-validation)

Public hosts can 302 to internal addresses. Without per-hop re-validation, a redirect chain trivially bypasses the private-IP block list.

### Recommended values

- [ ] Cap redirect chain at **5 hops**
- [ ] **Each hop is re-validated independently** against the private-IP block list (DNS pinning per hop)
- [ ] Excess hops or a redirect to a blocked address emits `code: "blocked-by-policy"`


## Recommended Operational Caps (SHOULD)

These mitigate resource-exhaustion attacks against the shell itself.

| Cap | Recommended default | On exceed |
|-----|---------------------|-----------|
| Per-response size | **10 MiB** | `code: "too-large"` |
| Per-URL fetch timeout (wall-clock) | **30 seconds** | `code: "timeout"` |
| Per-napplet concurrent in-flight `resource.bytes` calls | **10** | `code: "blocked-by-policy"` |
| Per-napplet `resource.bytes` rate limit (sliding window) | **60 calls / minute** | `code: "blocked-by-policy"` |
| Per-napplet outstanding-Blob quota | **~50 MiB** | `code: "quota-exceeded"` |

Community-deployed shells SHOULD NOT raise the response size cap above ~50 MiB without explicit operator opt-in.


## Single-Flight Cache (SHOULD)

Coalesce concurrent same-URL fetches.

- [ ] Cache keyed on the URL string as supplied by the napplet (byte-equal — this NAP does not mandate canonicalization)
- [ ] N concurrent calls for the same URL share **one** in-flight fetch and resolve with the same `Blob` reference
- [ ] Cache scope partitioned per `(dTag, aggregateHash)` per NIP-5D — napplets MUST NOT see another napplet's cached resources
- [ ] Aborted entries are removed from the in-flight map for retryability


## Scheme Whitelist (MUST)

Only the canonical schemes plus shell-administrator opt-ins are dispatched. Smuggling-prone schemes are never enabled by default.

### Canonical schemes

- [ ] `data:` (RFC 2397) — decoded in-shim with zero shell round-trip; size cap still applies on the decoded `Blob`
- [ ] `https:` — full Default Resource Policy applies
- [ ] `blossom:sha256:<hex>` — shell verifies hash against the URL's declared digest **before** delivery; mismatch → `code: "decode-failed"`
- [ ] `nostr:<bech32>` — single-hop NIP-19 resolution; recursive resolution is **not** the shell's job

### Never enable by default

- [ ] `file:` — local filesystem read; trivial sandbox escape
- [ ] `gopher:`, `dict:`, `ftp:`, `tftp:` — protocol smuggling vectors
- [ ] `http:` (cleartext) — opt-in only behind explicit shell-administrator policy (e.g., enterprise on-prem services)

Unknown schemes emit `code: "unsupported-scheme"`.


## Capability Advertisement

Shells advertise resource-NAP conformance via the standard capability query API:

- [ ] `shell.supports('nap:resource')` returns `true`
- [ ] `shell.supports('resource:scheme:<name>')` returns `true` for each supported scheme (e.g., `resource:scheme:blossom`)
- [ ] `shell.supports('perm:strict-csp')` returns `true` if the shell enforces strict CSP on napplet iframes (orthogonal to `nap:resource` — a permissive dev shell can implement the resource NAP without enforcing strict CSP)


## Audit Checklist (one-page summary)

Use this as a deployment sign-off:

- [ ] Private-IP block list enforced at DNS-resolution time, all 9 ranges covered
- [ ] Each redirect hop independently DNS-pinned and re-validated
- [ ] MIME byte-sniffing replaces upstream `Content-Type` for the value delivered to the napplet
- [ ] SVG rasterization runs in a sandboxed Worker with no network; raw `image/svg+xml` bytes never reach the napplet
- [ ] SVG caps (5 MiB input / 4096×4096 output / 2s wall-clock) all enforced together
- [ ] Sidecar pre-resolution defaults OFF; opt-in per shell deployment policy + per-event-kind allowlist
- [ ] Sidecar bytes obey the same MIME/SVG/size policy as direct calls
- [ ] Single-flight cache scoped per `(dTag, aggregateHash)`
- [ ] Scheme dispatch is a whitelist; smuggling-prone schemes blocked
- [ ] Capability advertisement (`nap:resource`, `resource:scheme:*`, optionally `perm:strict-csp`) wired through `shell.supports()`
- [ ] Resource bytes treated as observable (cleartext over postMessage); deployers document this in user-facing notice if relevant


## References

- [NAP-RESOURCE](https://github.com/napplet/naps) — normative spec for the resource NAP (wire shape, MUST/SHOULD/MAY contract)
- [NIP-5D](./NIP-5D.md) — napplet-shell protocol; Security Considerations subsection covers strict-CSP posture and `sandbox="allow-scripts"` reaffirmation
- [WHATWG MIME Sniffing Standard](https://mimesniff.spec.whatwg.org/) — recommended byte-sniffing reference
