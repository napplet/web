# Shell Connect Policy Checklist

> Shell-implementer guide for v0.29.0+ napplet hosts implementing NAP-CONNECT.
> Normative wire shape and MUST/SHOULD language live in NAP-CONNECT (napplet/naps); this document is a deployment checklist.

## Status

This is a non-normative implementer's guide. The normative spec is **NAP-CONNECT** in the `napplet/naps` repo. Shell hosts MUST implement the MUSTs defined there; this document enumerates the concrete defaults and decisions a deployer needs to make to do so correctly.

Class-2 posture details — the CSP shape, consent-flow MUSTs, residual-meta-CSP refuse-to-serve requirement, grant-persistence semantics, and revocation UX — are owned by `NAP-CLASS-2.md` in the same repo. This document surfaces those requirements as operator-actionable decisions and points at the normative source for each.

The sibling read-only NAP (NAP-RESOURCE) has its own deployer checklist at [SHELL-RESOURCE-POLICY.md](./SHELL-RESOURCE-POLICY.md); shells implementing both NAPs should treat the two documents as companions.

## Why this exists

NAP-CONNECT hands the napplet a direct network socket to user-approved origins. That grant bypasses every shell-side filter NAP-RESOURCE provides (MIME sniffing, private-IP block, redirect re-validation, SVG rasterization). The shell's defense-in-depth degrades, all at once, to three things: (a) getting informed consent right, (b) getting the CSP response header right, (c) refusing to serve a class of broken manifests that would silently suppress the grant.

A shell that implements NAP-CONNECT incorrectly does not fail loudly — it fails silently, with the user believing the napplet has network access it does not actually have, or with the napplet reaching origins the user did not approve. Neither failure mode emits a browser diagnostic. Neither failure mode is caught by a post-deployment smoke test that checks "does the napplet load." Both failure modes are detectable only by walking through the checklist below before deployment.

Deployers SHOULD work through the Audit Checklist at the bottom of this document as a sign-off gate and retain the completed list as deployment evidence.

## HTTP Responder Precondition (MUST)

Shell MUST own the HTTP response headers for the napplet's HTML. NAP-CONNECT's CSP grant is delivered via the `Content-Security-Policy` HTTP response header; a shell that does not control the response cannot enforce this NAP and MUST NOT advertise `nap:connect` as supported.

### Delivery Modes

- **Direct serving** — shell controls response headers fully. Watch CDN / edge caches that MAY strip or override `Content-Security-Policy` response headers (some CDNs have security-policy override knobs off by default). The emitted CSP varies per `(dTag, aggregateHash)` because the `connect-src` directive contains the user-approved origin list for that exact composite key; caches keyed on URL alone MUST be invalidated on grant change, or the cached response will serve the prior grant's CSP to a frame created after the grant changed.

- **HTTP proxy** — an HTTP proxy sitting between the shell and the browser MUST preserve or faithfully rewrite the shell-emitted CSP. Intermediate proxies that merge two origins' CSPs via intersection (a common "additive hardening" feature) will break Class-2 grants exactly the way a residual meta-CSP does: the browser sees `connect-src <granted> AND connect-src 'none'` intersected, which is `'none'`, and the grant silently evaporates. If the proxy cannot be configured to leave per-napplet CSP response headers alone, the proxy MUST NOT be in the napplet serving path.

- **`blob:` URL with HTML rewrite** — `blob:` URLs have no HTTP response and therefore no HTTP response header. The shell is forced back to `<meta http-equiv="Content-Security-Policy">` inside the rewritten HTML for the grant, which intersects (not overrides) any residual meta-CSP in the napplet author's HTML. Shells using this delivery mode MUST strip every pre-existing `<meta http-equiv="Content-Security-Policy">` element from the napplet HTML before injecting their own, and MUST run the residual-meta-CSP scan described below on the incoming HTML before rewrite.

- **`srcdoc=`** — `about:srcdoc` origin resolves `'self'` against the parent frame's origin rather than an opaque napplet origin; CSP directives that reference `'self'` have subtly different semantics in this mode. NAP-CONNECT's `connect-src` directive never uses `'self'` so this mode is usable, but the overall posture becomes parent-frame-scoped for directives that do use `'self'`. Shells choosing `srcdoc=` MUST either verify their full CSP directive set never references `'self'` or explicitly accept that other directives are parent-frame-origin-scoped, and MUST document the choice in the user-facing privacy notice.

Each delivery mode MUST be validated end-to-end — with a real napplet, a real user grant, and a real `fetch` / `WebSocket` to an approved origin that returns response bytes — before the deployment is considered compliant. A passing CSP linter is not a substitute; only a live fetch validates the entire delivery chain.

## Residual Meta-CSP Scan (MUST)

Shells MUST refuse to serve any napplet with a NAP-CLASS-2 posture (manifest contains at least one `['connect', ...]` tag) whose HTML body contains a `<meta http-equiv="Content-Security-Policy">` element. Browser CSP intersection silently reduces the header directive `connect-src <granted-origins>` AND any meta-level `connect-src` (including the common `connect-src 'none'` baseline) to the narrower of the two — in practice suppressing the grant with zero diagnostic. The user approves origins; the napplet still cannot reach them; no error is raised.

For napplets with a NAP-CLASS-1 posture (no `connect` tags), residual meta-CSP is harmless per `NAP-CLASS-1.md` (intersection of `'none'` and `'none'` is still `'none'`). The scan defined below MUST apply only to NAP-CLASS-2 napplets; applying it to Class-1 napplets is overzealous and would reject harmless hardening.

### Why parser, not regex

The residual-meta-CSP scan runs server-side against arbitrary napplet-author HTML. Regex-based scanners miss at least five real-world shapes: attribute reordering (`content=... http-equiv=...` order), case variations (`HTTP-EQUIV` vs `http-equiv`), single- vs double-quoted attribute values, HTML comments that mask a literal `<meta>` match in text, and `<![CDATA[...]]>` sections whose content looks like HTML but is not active. Regex-based meta-CSP checks may be acceptable at build time, where the napplet author controls the HTML shape the regex sees; shell-side scanning of arbitrary incoming napplet HTML MUST NOT use regex and MUST use a real WHATWG-compliant HTML parser such as `parse5`, `htmlparser2`, or equivalent.

### Parser-based example

```typescript
import { parse } from 'parse5';

function scanForResidualMetaCsp(napplethtml: string): void {
  const document = parse(napplethtml);
  const metas = findAllElements(document, (el) =>
    el.tagName === 'meta' &&
    getAttrValue(el, 'http-equiv')?.toLowerCase() === 'content-security-policy'
  );
  if (metas.length > 0) {
    throw new RefuseToServe({
      reason: 'residual-meta-csp',
      element: serializeElement(metas[0]),
      remediation:
        'napplet authors: remove <meta http-equiv="Content-Security-Policy"> ' +
        'from dist/index.html; CSP is now delivered via HTTP response headers ' +
        'under the NAP-CLASS-2 posture.',
    });
  }
}
```

The `findAllElements`, `getAttrValue`, and `serializeElement` helpers are standard parse5 tree-walk utilities (or their htmlparser2 equivalents). The key property is that the parser correctly handles comments, CDATA, quoted-attribute variation, and attribute-order variation — none of which regex can handle robustly.

### 5-Fixture Conformance Bundle

The following five HTML fixtures are normative for scanner conformance. Shells SHOULD include all five in their conformance test suite and MUST produce the expected outcome for each.

1. **Standard attribute order** (MUST be rejected):
   ```html
   <meta http-equiv="Content-Security-Policy" content="default-src 'self'">
   ```

2. **Attribute reordering** (MUST be rejected — tests that the scanner compares attribute values regardless of serialization order):
   ```html
   <meta content="default-src 'self'" http-equiv="Content-Security-Policy">
   ```

3. **Comment-adjacent live meta** (MUST be rejected — the meta is NOT inside the comment; the comment is a sibling. This fixture tests that the scanner correctly parses HTML comments — i.e., does not get confused by a nearby `<!--` sequence — and still detects the live meta that follows):
   ```html
   <!-- staging fixture --> <meta http-equiv="Content-Security-Policy" content="default-src *">
   ```

4. **Meta inside CDATA** (MUST NOT be rejected — this is the NEGATIVE test. CDATA content is not active HTML; a correct parser suppresses the CDATA-enclosed text and does not see a live meta element here. A dumb text-grep would incorrectly reject this fixture. Accepting it proves the scanner is parser-based):
   ```html
   <svg><![CDATA[<meta http-equiv="Content-Security-Policy" content="default-src *">]]></svg>
   ```

5. **Single-quoted attribute values + case variation** (MUST be rejected — the HTML parser normalizes attribute names to lowercase and accepts single-quoted values):
   ```html
   <META HTTP-EQUIV='content-security-policy' CONTENT='default-src *'>
   ```

A conformant scanner MUST reject fixtures 1, 2, 3, and 5, and MUST NOT reject fixture 4. A scanner that rejects fixture 4 is using text matching rather than parsing and MUST be replaced. A scanner that accepts any of 1, 2, 3, or 5 is missing a variation that attacker-supplied napplet HTML WILL exercise in the wild and MUST be fixed before the shell is deployed with Class-2 support.

## Mixed-Content Reality Check (MUST)

Browsers block `http:` and `ws:` fetches from napplets whose shell is served over `https:`, REGARDLESS of the emitted `connect-src` CSP value. This enforcement runs below the CSP layer inside the browser's mixed-content machinery and cannot be relaxed by the shell, the napplet, or any combination of CSP directives.

The narrow secure-context exceptions are:
- `localhost` (literal hostname)
- `127.0.0.1` (IPv4 loopback)
- `[::1]` (IPv6 loopback)

These hosts are treated as secure contexts by conformant browsers and MAY be fetched over `http:` or `ws:` from an HTTPS shell. No other cleartext origin is exempt — not RFC1918 private addresses, not `.local` mDNS names, not internal DNS names that happen to resolve to loopback.

A napplet declaring cleartext origins that get approved by the user will silently fail to fetch when the shell is served from an HTTPS origin (outside the exceptions above). The shell MUST surface this mixed-content reality in the consent prompt when cleartext origins are under consideration — the user approving the prompt deserves to know that the approval will not result in traffic in practice — and SHOULD emit a deployment-log warning when a Class-2 grant is served from HTTPS to a napplet whose approved origin list includes non-exempt cleartext entries.

The napplet-build tool already emits a build-time cleartext warning per NAP-CONNECT's Security Considerations section; deployers MAY use that build-log entry to drive deployment-time policy decisions, but the user-facing consent prompt MUST surface the same information at approval time because the build warning is invisible to the user.

## Cleartext Policy (MUST)

Operator policy MAY refuse cleartext entirely. Shells refusing cleartext MUST advertise `shell.supports('connect:scheme:http') === false` and `shell.supports('connect:scheme:ws') === false` via the NIP-5D capability query API, so that napplet authors can probe the shell's posture before relying on a cleartext grant being obtainable.

Shells MUST NOT silently strip cleartext origins from a manifest. A shell encountering a cleartext origin under a refuse-cleartext policy MUST refuse to serve the napplet with a diagnostic identifying the offending origin and the operator-policy reason. Silent downgrade (removing the cleartext origin and serving the remainder of the grant) would leave the napplet author believing their grant is intact while the napplet's cleartext traffic silently disappears — the same silent-failure mode the residual-meta-CSP rule is designed to eliminate.

Shells permitting cleartext MUST mark each cleartext origin visibly in the consent prompt with the confidentiality tradeoff: the user is approving unencrypted traffic with that origin, subject to the mixed-content rules above. The marking MUST be persistent (not an easily-dismissed first-time tooltip) and MUST sit alongside the origin, not in a separate section the user can skip past.

The shell-level capability advertisement is the authoritative signal; napplet-build tooling inspects `shell.supports('connect:scheme:http')` and `shell.supports('connect:scheme:ws')` and degrades gracefully when cleartext is refused, per NAP-CONNECT's Graceful Degradation section. Shells that change their cleartext policy after deployment MUST update the advertised capability value — a shell advertising `true` for `connect:scheme:http` while operationally refusing cleartext is emitting a state that disagrees with reality, which is precisely the cross-signal-disagreement failure mode the capability surface exists to prevent.

## Grant Persistence (MUST)

Grants MUST be keyed on the exact composite `(dTag, aggregateHash)`. Keying on `dTag` alone is a security bug — it allows a rebuilt napplet with a changed origin set (whose new `aggregateHash` differs via the `connect:origins` fold defined in NAP-CONNECT) to inherit the prior approval silently. This is the silent supply chain upgrade vector: a napplet author (or an attacker who compromised the author's build pipeline) adds a new origin, rebuilds, republishes, and the user's prior approval for the original origin set quietly covers the newly-added origin without re-prompt. See `NAP-CLASS-2.md`'s Grant Persistence Semantics section for the complete normative requirements.

The `connect:origins` fold defined in NAP-CONNECT produces a digest that participates in `aggregateHash`; ANY change to the declared origin set — addition, removal, or reorder after normalization — produces a new `aggregateHash` and auto-invalidates the prior grant, triggering a fresh consent prompt on next load. This is the mitigation for the silent supply chain upgrade vector: the key is composite and the hash-input covers the origin set, so no rebuilt napplet with a changed posture can inherit a prior approval.

Shells MAY extend the keying tuple (for example, to include the manifest author pubkey, or a network partition identifier for multi-tenant shells), but the extended key MUST be a strict superset of `(dTag, aggregateHash)` to remain portable across conformant shells. An extension that replaces `aggregateHash` with a looser key, or that drops `dTag` and uses only the hash, is non-conformant — a user approving a grant on one shell SHOULD see the same grant apply on a sibling conformant shell that the user trusts identically, and key-tuple divergence breaks that expectation.

## Revocation UX (MUST)

Shells MUST expose a user-facing revocation affordance for approved grants. Users who approved a grant at first load MUST be able to revoke it without needing to uninstall or delete the napplet, and the revocation path MUST be reachable from the same UI surface where the grant is listed (e.g., a settings pane that shows "approved origins per napplet" MUST have a revoke button, not a separate "delete this napplet" button that happens to also clear grants).

Revoked grants MUST move to a DENIED state rather than being deleted outright. Shells retain historical knowledge — the user approved once, then revoked — which enables two UX affordances: (a) re-approve paths that surface "you previously approved these origins on [date]" context rather than treating the napplet as brand-new, and (b) audit UX showing past decisions and when they were reversed. Grants that are deleted rather than moved to DENIED make the second prompt on re-encounter indistinguishable from a first prompt, which degrades the user's ability to reason about their approval history.

Revocation takes effect no later than the next time the affected `(dTag, aggregateHash)` is loaded. Shells MUST NOT emit the revoked origins in `connect-src` for any napplet frame created after the revocation is acknowledged. In-session (mid-lifecycle) class re-assignment is out of scope — `NAP-CLASS.md`'s at-most-one-envelope rule forbids dynamic re-assignment — but the next frame creation under the same composite key MUST see the denied posture. See `NAP-CLASS-2.md`'s Revocation Timing security consideration for the normative source.

A napplet whose grant is revoked mid-session will continue to run with its prior `window.napplet.connect.granted === true` view until the next frame creation. Napplet authors SHOULD NOT assume the grant is stable across a page-reload boundary; shells MUST honor revocation at next frame creation.

## Consent UX Language (MUST)

The consent prompt MUST capture the following semantic elements. Exact wording is a shell-UX decision, but the MUSTs are load-bearing regardless of copy:

1. Napplet name as declared in the NIP-5A manifest (so the user knows which napplet is asking).
2. Complete list of requested origins verbatim (NO summarization, NO truncation, NO first-presentation elision). A prompt that shows "foo.com and 4 others" forces the user to click through to see what they are approving, and many users will click approve without clicking through. The full list is shown at first display.
3. Explicit statement that approval allows the napplet to **send AND receive** any data with the listed origins — the grant is not read-only, not shell-mediated, and not rate-limited. Users who have approved NAP-RESOURCE capability before MAY assume NAP-CONNECT is similarly read-only; the prompt text MUST correct that assumption before approval.
4. Explicit statement that the shell cannot see or filter post-grant traffic between the napplet and the listed origins. Users reasoning about "can the shell protect me" deserve to know the honest answer, which is "no, not here."
5. Visible marking of any cleartext (`http:` or `ws:`) origins alongside the confidentiality tradeoff: the user is approving unencrypted traffic with that origin, subject to the mixed-content rules documented above.

Shells MUST NOT use diminutive language ('just', 'only', 'simply') that understates the trust cost of approval. Consent prompts written to minimize user friction at the expense of informed consent are misleading the user — regardless of operator intent. Write the prompt for an informed user; assume they can handle accurate language.

An acceptable one-sentence framing that conveys the full scope of the grant: *"This napplet can talk with foo.com however it wants."* Shells MAY vary the wording, MAY place it above or below the origin list, MAY repeat the phrasing per cleartext origin, but MUST convey that the grant is bidirectional and shell-opaque. The phrasing is not normatively required; the semantics are.

## Explicit N/A Items

The following items appear in NAP-RESOURCE's shell-deployer policy surface but are DELIBERATELY not required for NAP-CONNECT, because the browser enforces CSP transparently to the shell and the shell has no post-grant hook:

- **Private-IP block list** — NAP-RESOURCE validates against resolved IPs at DNS-resolution time before opening the TCP connection. NAP-CONNECT cannot do the equivalent: browser CSP `connect-src` matches the URL literal (hostname as written in the origin), not the resolved IP, and DNS rebinding would bypass any shell-side origin-match check regardless of how cleverly it is written. This is a NAP-RESOURCE-only concern; shells implementing both NAPs MUST enforce the private-IP block list for the RESOURCE path and MUST document — in their user-facing privacy notice — that the CONNECT path does not provide the same guarantee.

- **MIME byte-sniffing** — the shell does not see post-grant response bytes. There is no byte-layer hook to replace the upstream `Content-Type` header with a shell-classified MIME; the napplet's `fetch` returns response bytes directly from the browser's network stack.

- **SVG rasterization caps** — the shell does not see post-grant response bytes. A NAP-CONNECT grant includes the ability to fetch SVG directly from approved origins; the napplet is responsible for deciding what to do with those bytes. If the napplet's use case involves rendering untrusted SVG, the napplet author SHOULD route that specific fetch through NAP-RESOURCE (which rasterizes) instead of NAP-CONNECT.

- **Redirect chain limits** — the browser follows HTTP redirects at the network layer, below the shell's visibility. CSP is re-checked per hop by the browser (redirect to a non-granted origin fails the CSP match), but the shell has no hook to cap hop count or re-validate the per-hop address list.

- **Size, rate, or quota caps on granted traffic** — the browser enforces CSP transparently; no shell hook exists to impose per-request quotas without a service worker, which the napplet's `sandbox="allow-scripts"` iframe forbids from registering. Shells wishing to impose quotas on network egress MUST do so at the shell process's own OS-level or network-level boundary, not inside the napplet's execution context.

Deployers MUST NOT interpret the absence of these items from the NAP-CONNECT policy surface as "NAP-CONNECT is safer than NAP-RESOURCE." The correct interpretation is the opposite: NAP-CONNECT is a weaker posture with a narrower shell-enforced threat model, and it compensates for the weaker posture by requiring full informed consent from the user on the specific origins the napplet wants to reach. The shell's role in the NAP-CONNECT threat model is to get consent right — not to filter traffic after consent.

## Audit Checklist (one-page summary)

Use this as a deployment sign-off. Every item is a MUST unless explicitly marked otherwise. A deployment SHOULD NOT be considered compliant until every box is checked.

- [ ] Shell owns HTTP response headers for the napplet HTML (POLICY-02)
- [ ] Delivery mode chosen (direct / HTTP proxy / `blob:` / `srcdoc=`) validated end-to-end with a real grant + real `fetch` or `WebSocket` to an approved origin (POLICY-02)
- [ ] CDN / edge-cache invalidation on grant change for direct-serve deployments — cached CSP responses do not outlive the grant they were emitted under (POLICY-02)
- [ ] Residual meta-CSP scanner is parser-based (not regex), applied ONLY to NAP-CLASS-2 napplets (POLICY-03)
- [ ] Scanner rejects fixtures 1, 2, 3, and 5 of the 5-fixture conformance bundle; accepts fixture 4 (the CDATA negative test) (POLICY-03)
- [ ] Refuse-to-serve diagnostic on residual meta-CSP identifies the offending element and points the napplet author at rebuild guidance (POLICY-03)
- [ ] Consent prompt visibly marks cleartext (`http:` / `ws:`) origins with the confidentiality tradeoff (POLICY-04, POLICY-05, POLICY-08)
- [ ] `shell.supports('connect:scheme:http')` and `shell.supports('connect:scheme:ws')` advertised truthfully and kept in sync with operator cleartext policy (POLICY-05)
- [ ] Cleartext mixed-content failure reality surfaced in the consent prompt and in the deployment log (POLICY-04)
- [ ] Grants keyed on the exact composite `(dTag, aggregateHash)` — NOT `dTag` alone (POLICY-06)
- [ ] Any extended keying tuple is a strict superset of `(dTag, aggregateHash)` — no looser key, no replacement (POLICY-06)
- [ ] User-facing revocation affordance exists and revoked grants move to DENIED (not deleted) state so the shell retains history (POLICY-07)
- [ ] Revocation is effective at next `(dTag, aggregateHash)` frame creation; no revoked origins appear in `connect-src` for frames created after revocation is acknowledged (POLICY-07)
- [ ] Consent prompt captures napplet name + complete origin list verbatim + send-AND-receive wording + shell-blind-to-traffic wording + cleartext marking (POLICY-08)
- [ ] Consent language free of diminutive understatement ('just', 'only', 'simply') that would misrepresent the trust cost (POLICY-08)
- [ ] Deployer team has read the NAP-RESOURCE-only N/A items and documented the tradeoff (no private-IP block, no MIME sniffing, no SVG rasterization, no redirect limits on CONNECT path) in the shell's user-facing privacy notice (POLICY-09)

## References

- **NAP-CONNECT** — normative spec for the NAP (manifest-tag shape `['connect', '<origin>']`, origin format rules, `connect:origins` canonical aggregateHash fold, runtime API at `window.napplet.connect`, capability advertisement `nap:connect` / `connect:scheme:http` / `connect:scheme:ws`). Repo: `napplet/naps`.
- **NAP-CLASS-2.md** — normative spec for the Class-2 posture (CSP shape `connect-src <granted-origins>`, consent-flow MUSTs, grant-persistence semantics on the `(dTag, aggregateHash)` composite key, residual-meta-CSP refuse-to-serve requirement, revocation UX). Repo: `napplet/naps`.
- **NAP-CLASS-1.md** — normative spec for the default strict-baseline posture (`connect-src 'none'`); relevant for the residual-meta-CSP Class-1-harmless-vs-Class-2-refuse-to-serve distinction. Repo: `napplet/naps`.
- **NAP-CLASS.md** — parent class-track spec; defines the `class.assigned` wire envelope and the `window.napplet.class` runtime surface. Repo: `napplet/naps`.
- **NAP-RESOURCE** — sibling read-only NAP. Authors SHOULD default to NAP-RESOURCE for anything it can express and reach for NAP-CONNECT only when direct `POST` / WebSocket / SSE / streaming is required. Repo: `napplet/naps`.
- [NIP-5D](./NIP-5D.md) — parent transport spec (JSON envelope wire format, iframe sandbox model, capability advertisement surface).
- [SHELL-RESOURCE-POLICY.md](./SHELL-RESOURCE-POLICY.md) — sibling deployer-policy doc for NAP-RESOURCE (private-IP block list, MIME byte-sniffing, SVG rasterization caps, redirect chain limits — all the items explicitly N/A to NAP-CONNECT above).
- [WHATWG Mixed Content](https://w3c.github.io/webappsec-mixed-content/) — browser-level mixed-content enforcement reference; authoritative source for the `localhost` / `127.0.0.1` / `[::1]` secure-context exceptions.
- [WHATWG HTML Parser](https://html.spec.whatwg.org/multipage/parsing.html) — parsing reference for the residual-meta-CSP scanner (comments, CDATA, attribute-name case normalization, quoted-value handling).
