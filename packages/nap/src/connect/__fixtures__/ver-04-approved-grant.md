# VER-04 Fixture: Approved-Grant Positive Path

**Status:** Documented test vector (exportable to downstream shell repo).

**Why here:** This repo is SDK-only. Playwright tests against a real shell live in
the downstream shell repo per the Option B arrangement (carried forward from v0.28.0).
This file documents the test-vector shape; the downstream shell repo's Playwright
suite is responsible for implementing and executing the test.

Translate this fixture into a Playwright test in the downstream shell's suite. The
shell-side preconditions section tells the deployer exactly what the shell must do;
the assertion section tells the test author exactly what to assert in the browser.

## Scenario

A napplet declares `connect` origins in its NIP-5A manifest. The host shell
advertises `nap:connect` + `nap:class` and prompts the user for approval on first
load. The user approves. The shell serves the napplet HTML with a
`Content-Security-Policy` HTTP response header whose `connect-src` directive
contains the approved origins, and injects
`<meta name="napplet-connect-granted" content="<space-separated-origins>">` into
the HTML. The napplet's `@napplet/shim` reads the meta tag at install time and
mounts `window.napplet.connect = { granted: true, origins: [...] }`. The shell
dispatches `class.assigned` with `class: 2` via NAP-CLASS wire after the shim
bootstrap completes. This is the **positive path**.

## Expected Observable Behavior

1. `window.napplet.connect.granted === true`
2. `window.napplet.connect.origins` is frozen/readonly and contains every approved
   origin in the order the shell injected them via the meta tag
3. `fetch(<approved-origin>/<path>)` succeeds (no CSP violation; request reaches
   the network and returns response bytes — success is observed as a resolving
   promise, not a `securitypolicyviolation` event)
4. `fetch(<non-approved-origin>/<path>)` FAILS: the browser emits a
   `securitypolicyviolation` DOM event on the document with
   `violatedDirective === 'connect-src'` (or a prefixed variant), AND the request
   is blocked at the browser level before it hits the network
5. `window.napplet.class === 2` (cross-NAP invariant: in a shell implementing BOTH
   NAP-CLASS AND NAP-CONNECT, `class === 2` iff `connect.granted === true` at the
   time `class.assigned` is sent — see SHELL-CLASS-POLICY.md Cross-NAP Invariant
   scenario table row 1)

## HTML Fixture (shell-served to the iframe)

```html
<!DOCTYPE html>
<html>
<head>
  <meta name="napplet-connect-granted" content="https://api.example.com https://cdn.example.com">
  <!-- NOTE: The Content-Security-Policy MUST be delivered via the HTTP response
       header, NOT via <meta http-equiv="Content-Security-Policy"> — per
       SHELL-CONNECT-POLICY's Residual Meta-CSP Scan rule. See ver-07 fixture for
       the negative case where a residual meta-CSP causes refuse-to-serve. -->
  <title>Test Napplet</title>
</head>
<body>
  <script type="module" src="/napplet-bundle.js"></script>
</body>
</html>
```

## HTTP Response Headers (shell-controlled)

```
Content-Type: text/html; charset=utf-8
Content-Security-Policy: default-src 'none'; script-src 'self'; connect-src https://api.example.com https://cdn.example.com; style-src 'self'; img-src 'self' data:
```

The `connect-src` directive MUST contain the user-approved origin list exactly;
the meta tag's `content` value MUST match. Any divergence between the header and
the meta tag is a cross-signal-disagreement bug the napplet cannot detect — it
will branch on the meta-tag-derived `window.napplet.connect.origins` while the
browser enforces the header-derived directive.

## Manifest Fixture (napplet-side — what the shell READS before serving)

```
["d", "test-approved-napplet"]
["napplet-type", "test-napplet"]
["connect", "https://api.example.com"]
["connect", "https://cdn.example.com"]
... (other manifest tags per NIP-5A)
```

The presence of `connect` tags triggers the NAP-CLASS-2 posture per NAP-CLASS-2.md;
the user is prompted at first load for the exact origin set, keyed on the
composite `(dTag, aggregateHash)` per NAP-CONNECT's Grant Persistence section.

## Playwright Assertion Shape

```javascript
// (1) Approved-origin fetch succeeds:
const approvedStatus = await page.evaluate(async () => {
  const r = await fetch('https://api.example.com/health');
  return r.status;
});
expect(approvedStatus).toBe(200);

// (2) Non-approved origin triggers securitypolicyviolation:
const violation = await page.evaluate(() => new Promise((resolve) => {
  document.addEventListener('securitypolicyviolation', (e) => resolve({
    blockedURI: e.blockedURI,
    violatedDirective: e.violatedDirective,
  }), { once: true });
  fetch('https://not-approved.example.com/data').catch(() => {});
}));
expect(violation.blockedURI).toContain('not-approved.example.com');
expect(violation.violatedDirective).toContain('connect-src');

// (3) Runtime state reflects the grant:
const connectState = await page.evaluate(() => ({
  granted: window.napplet.connect.granted,
  origins: [...window.napplet.connect.origins],
}));
expect(connectState.granted).toBe(true);
expect(connectState.origins).toEqual([
  'https://api.example.com',
  'https://cdn.example.com',
]);

// (4) Cross-NAP invariant (shells implementing both NAP-CLASS and NAP-CONNECT):
const classValue = await page.evaluate(() => window.napplet.class);
expect(classValue).toBe(2);
```

## Shell-Side Preconditions (deployer checklist subset)

Before running this test, the shell under test MUST satisfy every item in
SHELL-CONNECT-POLICY.md's Audit Checklist that applies to the approved-grant
path. Condensed precondition list specific to this fixture:

- **HTTP-Responder Precondition:** Shell owns the response headers for the
  napplet HTML (not a `blob:` rewrite, not a `srcdoc=` that would change
  `'self'` semantics, not an HTTP proxy that might intersect CSP directives).
- **Residual Meta-CSP Scan:** The HTML served contains NO
  `<meta http-equiv="Content-Security-Policy">` element. Shell's parser-based
  scanner has already rejected such napplets before they reach this test.
- **Consent Persistence:** The test user's prior approval of the exact
  `(dTag, aggregateHash)` composite key is already recorded in the shell's grant
  store. First-load prompt has already been dismissed with approval.
- **`napplet-connect-granted` meta tag** injected into the served HTML with
  space-separated approved origins, matching the `connect-src` header value
  byte-identically after normalization.
- **CSP header matches grant:** `connect-src <origins>` in the HTTP response
  header lists exactly the origins the user approved.

Follow [SHELL-CLASS-POLICY.md](../../../../../specs/SHELL-CLASS-POLICY.md) for the
class-side preconditions:

- **Class-Assignment Wire Timing:** `class.assigned` envelope dispatched AFTER
  shim bootstrap signals ready AND BEFORE the napplet's first `DOMContentLoaded`
  handler runs. Coupling to the shim's ready signal is the recommended integration.
- **Cross-NAP Invariant:** `class: 2` sent because `connect.granted === true` at
  the moment the envelope was dispatched. No scenario table row outside
  SHELL-CLASS-POLICY.md's table.

## References

- **NAP-CONNECT** (napplet/naps) — Runtime API `NappletConnect` interface +
  `window.napplet.connect` surface; meta-tag name `napplet-connect-granted`;
  `(dTag, aggregateHash)` grant key.
- [SHELL-CONNECT-POLICY.md](../../../../../specs/SHELL-CONNECT-POLICY.md) —
  HTTP-Responder Precondition, Residual Meta-CSP Scan, Grant Persistence.
- [SHELL-CLASS-POLICY.md](../../../../../specs/SHELL-CLASS-POLICY.md) —
  Cross-NAP Invariant scenario table (Row 1: User approves Class-2 prompt);
  Wire Timing.
- `packages/nap/src/connect/shim.ts` — `installConnectShim()` implementation that
  reads the `napplet-connect-granted` meta tag synchronously at install time.
- `packages/nap/src/class/shim.ts` — `installClassShim()` that registers the
  `class.assigned` wire handler.
