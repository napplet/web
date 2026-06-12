# VER-07 Fixture: Residual Meta-CSP — Class-2 Refuse-to-Serve vs Class-1 Harmless

**Status:** Documented test vector (exportable to downstream shell repo).

**Why here:** This repo is SDK-only. Shell-side refuse-to-serve enforcement and
the residual meta-CSP scanner live in the downstream shell repo per the Option B
arrangement. This file documents two dual-scenario test vectors (A: refuse-to-
serve under Class-2; B: harmless-but-noted under Class-1) that the downstream
repo's Playwright suite should translate into two tests.

Translate each scenario into a Playwright test that drives the shell's
serve-time handler. The CSP enforcement happens at the HTTP layer BEFORE the
iframe is ever navigated; both tests therefore assert against the shell's HTTP
response rather than any in-frame JavaScript behavior.

## Why this matters

Browser CSP rules INTERSECT HTTP response headers and `<meta http-equiv>`
directives. Per SHELL-CONNECT-POLICY.md § Residual Meta-CSP Scan: a Class-2
napplet HTML containing `<meta http-equiv="Content-Security-Policy">` with
`connect-src 'none'` (or any other default-hardened CSP) INTERSECTS the shell-
emitted `connect-src <granted-origins>` header, producing `connect-src 'none'`
at the browser's enforcement layer. The user approved origins; the napplet
cannot reach them; no browser diagnostic fires. This is the exact silent-
failure mode the residual-meta-CSP scan exists to prevent.

For Class-1 napplets (no `connect` tags per the manifest), the shell already
emits `connect-src 'none'` as the strict baseline; a residual meta-CSP with
`connect-src 'none'` INTERSECTS with `'none'` and remains `'none'` — harmless.
A more restrictive meta-CSP on a Class-1 napplet CANNOT open any new capability
(intersection is monotonic-restrictive), so the refuse-to-serve rule applies
**only** to Class-2. Rejecting Class-1 napplets for a residual meta-CSP would
be overzealous and would break harmless author hardening patterns.

## Scenario A — Class-2 Refuse-to-Serve (positive rejection path)

A napplet declares `connect` tags (Class-2 posture per NAP-CLASS-2.md) and its
HTML contains a residual meta-CSP. The shell's parser-based scanner detects the
residual meta-CSP at serve time and refuses to serve the napplet with the
prescribed diagnostic. The iframe is never loaded; the end-user sees the
shell's refuse-to-serve UI instead of a broken napplet.

### Expected Observable Behavior (A)

1. The shell's HTTP handler returns status 400 (or 409 or 403 — shell's choice,
   SHOULD be a 4xx class code indicating the napplet is non-conformant).
2. The response body contains a diagnostic identifying the offending residual
   meta element and pointing the napplet author at rebuild guidance per
   SHELL-CONNECT-POLICY.md (the policy MAY be paraphrased but the meta
   identification and rebuild pointer are REQUIRED).
3. No iframe is created; no napplet bundle is loaded; the napplet's own code
   never runs.
4. The shell's audit log records the refusal keyed on `(dTag, aggregateHash)`
   so deployers can diagnose the rebuild path for the napplet author.

### HTML Fixture (A — Class-2 napplet with residual meta-CSP)

```html
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'">
  <meta name="napplet-connect-granted" content="https://api.example.com">
  <title>Broken Class-2 Napplet</title>
</head>
<body>
  <script type="module" src="/napplet-bundle.js"></script>
</body>
</html>
```

Per SHELL-CONNECT-POLICY.md § Residual Meta-CSP Scan, the 5-fixture conformance
bundle MUST also be exercised — fixtures 1, 2, 3, 5 (standard ordering,
attribute reordering, comment-adjacent live meta, case-variation) MUST all be
rejected; fixture 4 (CDATA-enclosed meta — NOT an active element) MUST NOT be
rejected (negative test proving the scanner is parser-based, not regex).

### Manifest Fixture (A)

```
["d", "broken-class2-napplet"]
["napplet-type", "test-napplet"]
["connect", "https://api.example.com"]
... (other manifest tags)
```

Presence of `connect` tags places the napplet in the Class-2 posture. The
residual meta-CSP scan applies.

### Playwright Assertion Shape (A)

```javascript
// (A.1) Serve-time refuse-to-serve — HTTP 4xx from the shell:
const response = await page.goto(
  'https://shell.example.com/napplet/broken-class2-napplet/',
  { waitUntil: 'commit' } // don't wait for load; expect refusal
);
expect(response.status()).toBeGreaterThanOrEqual(400);
expect(response.status()).toBeLessThan(500);

// (A.2) Diagnostic body identifies the residual meta element and rebuild
//       guidance per SHELL-CONNECT-POLICY.md:
const body = await response.text();
expect(body.toLowerCase()).toContain('content-security-policy');
expect(body.toLowerCase()).toMatch(/rebuild|remove|http response header/);

// (A.3) No napplet iframe exists in the parent document (shell rendered the
//       refusal UI instead of the napplet):
const iframeCount = await page.locator(
  'iframe[src*="broken-class2-napplet"]',
).count();
expect(iframeCount).toBe(0);
```

### Shell-Side Preconditions (A)

- **Scanner is parser-based**, not regex. Per SHELL-CONNECT-POLICY.md, a regex
  scanner misses attribute reordering, case variation, single-quoted values,
  comments that mask matches, and CDATA sections whose content looks like HTML
  but is not active. The downstream shell's scanner MUST use a WHATWG-compliant
  HTML parser (parse5 / htmlparser2 / equivalent).
- **Scan applies ONLY to Class-2 napplets** — manifest with at least one
  `['connect', ...]` tag. Applying to Class-1 would produce the harmless-
  rejection bug Scenario B tests for.
- **5-fixture conformance bundle passes** — rejects fixtures 1, 2, 3, 5;
  accepts fixture 4. Any scanner that rejects fixture 4 is text-matching and
  must be replaced; any scanner that accepts 1, 2, 3, or 5 is missing a real-
  world variation and must be fixed before deployment.

## Scenario B — Class-1 Harmless-but-Noted (overzealous-rejection guard)

A napplet declares NO `connect` tags (Class-1 posture) and its HTML contains a
residual meta-CSP, identical to the Scenario A one. The shell observes the
residual meta-CSP, recognizes the napplet as Class-1, and SERVES the napplet
WITHOUT refusing. The shell MAY emit a deployment-log warning noting the
residual meta-CSP and the fact that it was harmless under Class-1, so
deployers can nudge authors toward cleaner HTML even when the posture does not
require it. The napplet loads and runs normally with `connect-src 'none'` at
both the header AND meta levels — harmlessly redundant.

### Expected Observable Behavior (B)

1. The shell's HTTP handler returns status 200 (or whatever the shell's normal
   success code is — no 4xx refusal).
2. The napplet iframe is created; the napplet bundle loads and runs.
3. `window.napplet.connect.granted === false` (graceful-degradation default;
   identical to VER-05 denied-grant state since Class-1 has no grant concept).
4. `window.napplet.class === 1` (Class-1 strict posture per NAP-CLASS-1.md).
5. The shell's deployment log records a warning (noting the residual meta-CSP
   + the Class-1 determination + the decision to serve). Deployer retains this
   for the author-nudge UX. The log entry is informational, not an error.

### HTML Fixture (B — Class-1 napplet with same residual meta-CSP as A)

```html
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'">
  <title>Harmless Class-1 Napplet</title>
</head>
<body>
  <script type="module" src="/napplet-bundle.js"></script>
</body>
</html>
```

Note the absence of a `napplet-connect-granted` meta tag — Class-1 has no
grant-to-surface. The residual meta-CSP is byte-identical to Scenario A's.

### Manifest Fixture (B)

```
["d", "harmless-class1-napplet"]
["napplet-type", "test-napplet"]
... (other manifest tags, no `connect` tags)
```

Absence of `connect` tags means Class-1 posture. The residual meta-CSP scan
must NOT apply.

### Playwright Assertion Shape (B)

```javascript
// (B.1) Napplet serves successfully — NO refuse-to-serve:
const response = await page.goto(
  'https://shell.example.com/napplet/harmless-class1-napplet/',
);
expect(response.status()).toBe(200);

// (B.2) Iframe loaded and napplet bootstrap ran:
const iframeCount = await page.locator(
  'iframe[src*="harmless-class1-napplet"]',
).count();
expect(iframeCount).toBeGreaterThan(0);

// (B.3) Class-1 runtime state:
const frame = page.frameLocator('iframe[src*="harmless-class1-napplet"]');
const runtimeState = await frame.locator('body').evaluate(() => ({
  granted: window.napplet.connect.granted,
  origins: [...window.napplet.connect.origins],
  class: window.napplet.class,
}));
expect(runtimeState.granted).toBe(false);
expect(runtimeState.origins).toEqual([]);
expect(runtimeState.class).toBe(1);
```

### Shell-Side Preconditions (B)

- **Scan gate** — shell's scan implementation keys off the manifest's Class
  determination. Class-1 napplets skip the scan entirely; no rejection path.
- **Log warn is optional** — shells MAY log the residual meta-CSP for deployer
  visibility. Shells that choose not to log produce an observationally-identical
  Playwright result (the test asserts the absence of refuse-to-serve, not the
  presence of the log line).

## Common Preconditions (A and B)

- **Manifest class-determination is correct** — the shell correctly identifies
  Class-2 vs Class-1 from the manifest's `connect` tags (present vs absent).
  Misclassification turns Scenario A into a false-negative (Class-2 with
  residual meta-CSP served) or Scenario B into a false-positive (Class-1
  refused for residual meta-CSP). See NAP-CLASS-2.md for the normative
  class-determination rules.
- **Scanner testing in isolation** — the shell SHOULD have unit tests for the
  scanner itself against the 5-fixture conformance bundle before integration-
  level Playwright tests run. Playwright asserts end-to-end shell behavior; the
  5-fixture bundle asserts parser-correctness at the component level.
- **Diagnostic stability** — the refuse-to-serve diagnostic body in Scenario A
  is a test vector for deployer sign-off. Shells MAY localize or restyle the
  diagnostic; the identification (offending element) + remediation pointer
  (rebuild guidance) MUST remain.

## References

- **NAP-CONNECT** (napplet/naps) — Class-2 posture trigger (presence of `connect`
  tags); `(dTag, aggregateHash)` grant key.
- **NAP-CLASS-2.md** (napplet/naps) — Class-2 CSP shape `connect-src <granted>`;
  residual meta-CSP refuse-to-serve requirement.
- **NAP-CLASS-1.md** (napplet/naps) — Class-1 CSP shape `connect-src 'none'`;
  residual meta-CSP harmless at this posture.
- [SHELL-CONNECT-POLICY.md](../../../../../specs/SHELL-CONNECT-POLICY.md) §
  Residual Meta-CSP Scan — parser-based requirement, 5-fixture conformance
  bundle (including the CDATA negative test fixture 4), refuse-to-serve
  diagnostic prose guidance.
- **Phase 138-02 precedent** — the in-repo vite-plugin inline-script scanner
  uses a similar parse-aware pattern (allow-list of `<script type>` values +
  HTML comment stripping before scan); the shell's residual-meta-CSP scanner is
  the run-time equivalent for arbitrary author HTML.
- `packages/vite-plugin/src/index.ts` — `assertNoInlineScripts` helper (build-
  time analogue of the shell's serve-time residual-meta-CSP scanner; different
  mechanism, same fail-loud-on-author-HTML-bug philosophy).
