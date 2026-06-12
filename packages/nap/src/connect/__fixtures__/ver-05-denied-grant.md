# VER-05 Fixture: Denied-Grant Negative Path

**Status:** Documented test vector (exportable to downstream shell repo).

**Why here:** This repo is SDK-only. Playwright tests against a real shell live in
the downstream shell repo per the Option B arrangement. This file documents the
test-vector shape; the downstream shell repo's Playwright suite is responsible
for implementing and executing the test.

Translate this fixture into a Playwright test in the downstream shell's suite.
The deployer preconditions describe what the shell must do at serve time; the
assertion section describes what the test author asserts in the browser.

## Scenario

A napplet declares `connect` origins in its NIP-5A manifest. The host shell
advertises `nap:connect` + `nap:class` and prompts the user for approval on first
load. **The user denies.** The shell MUST serve the napplet HTML with a
`Content-Security-Policy` HTTP response header whose `connect-src` directive is
`'none'` (the strict baseline), AND either inject
`<meta name="napplet-connect-granted" content="">` (empty content) OR omit the
meta tag entirely. The napplet's `@napplet/shim` reads the meta tag at install
time; with an empty value or absent tag, graceful-degradation default
`{ granted: false, origins: [] }` takes effect. The shell dispatches
`class.assigned` with `class: 1` (Class-1 strict posture — see NAP-CLASS-1.md)
via NAP-CLASS wire after the shim bootstrap completes. This is the **negative
path**.

## Expected Observable Behavior

1. `window.napplet.connect.granted === false` (graceful-degradation default)
2. `window.napplet.connect.origins` is an empty readonly array (`[]`); never
   `undefined`, never `null`
3. `fetch(<any-origin>/<path>)` — regardless of whether the origin was in the
   original manifest declaration — FAILS with a `securitypolicyviolation` DOM
   event on the document, `violatedDirective === 'connect-src'`, AND the request
   is blocked at the browser level before it hits the network
4. `window.napplet.class === 1` (cross-NAP invariant: `class === 1` iff
   `connect.granted === false`; denial is semantically equivalent to "no connect
   tags" — see SHELL-CLASS-POLICY.md Cross-NAP Invariant scenario table row 2)

## HTML Fixture (shell-served to the iframe)

Two conformant HTML shapes. Shells MAY choose either; both produce the
graceful-degradation default in the napplet.

**Shape A (empty-content meta tag — explicit denial signal):**

```html
<!DOCTYPE html>
<html>
<head>
  <meta name="napplet-connect-granted" content="">
  <title>Test Napplet</title>
</head>
<body>
  <script type="module" src="/napplet-bundle.js"></script>
</body>
</html>
```

**Shape B (meta tag absent — degradation-default path):**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Test Napplet</title>
</head>
<body>
  <script type="module" src="/napplet-bundle.js"></script>
</body>
</html>
```

Per `packages/nap/src/connect/shim.ts`, both shapes resolve to
`window.napplet.connect = { granted: false, origins: [] }` via the shim's
graceful-degradation path.

## HTTP Response Headers (shell-controlled)

```
Content-Type: text/html; charset=utf-8
Content-Security-Policy: default-src 'none'; script-src 'self'; connect-src 'none'; style-src 'self'; img-src 'self' data:
```

The `connect-src 'none'` directive is the Class-1 strict baseline per
NAP-CLASS-1.md. It blocks every `fetch` / `WebSocket` / `EventSource` regardless
of origin. Any CSP that is more permissive than `connect-src 'none'` when the
user denied is a cross-signal-disagreement bug — the user said no and the
browser is enforcing yes.

## Manifest Fixture (napplet-side — what the shell READS before serving)

```
["d", "test-denied-napplet"]
["napplet-type", "test-napplet"]
["connect", "https://api.example.com"]
["connect", "https://cdn.example.com"]
... (other manifest tags per NIP-5A)
```

Note the manifest is identical in shape to the VER-04 approved-grant fixture —
the same napplet, same declared origins. The difference is the user's consent
outcome, which is persisted in the shell's grant store keyed on
`(dTag, aggregateHash)` per NAP-CONNECT's Grant Persistence section.

## Playwright Assertion Shape

```javascript
// (1) Runtime state reflects denial (graceful-degradation default):
const connectState = await page.evaluate(() => ({
  granted: window.napplet.connect.granted,
  origins: [...window.napplet.connect.origins],
}));
expect(connectState.granted).toBe(false);
expect(connectState.origins).toEqual([]);

// (2) Fetch to a manifest-declared origin is STILL blocked (denial means no
//     network access; the manifest declaration is the request, not the grant):
const violation = await page.evaluate(() => new Promise((resolve) => {
  document.addEventListener('securitypolicyviolation', (e) => resolve({
    blockedURI: e.blockedURI,
    violatedDirective: e.violatedDirective,
  }), { once: true });
  fetch('https://api.example.com/health').catch(() => {});
}));
expect(violation.blockedURI).toContain('api.example.com');
expect(violation.violatedDirective).toContain('connect-src');

// (3) CSP header contains connect-src 'none':
const cspHeader = await page.evaluate(async () => {
  const r = await fetch(window.location.href, { method: 'HEAD' });
  return r.headers.get('Content-Security-Policy');
});
expect(cspHeader).toMatch(/connect-src 'none'/);

// (4) Cross-NAP invariant (shells implementing both NAP-CLASS and NAP-CONNECT):
const classValue = await page.evaluate(() => window.napplet.class);
expect(classValue).toBe(1);
```

## Shell-Side Preconditions (deployer checklist subset)

- **HTTP-Responder Precondition:** Shell owns the HTTP response header for the
  napplet HTML (same precondition as the VER-04 approved-grant path; the negative
  path has no relaxation).
- **Consent Persistence:** The user's denial is recorded in the shell's grant
  store, keyed on exact `(dTag, aggregateHash)` composite. Next load under the
  same composite key re-produces the denied posture without re-prompting.
  Revocation after a prior approval moves the grant to the DENIED state — see
  SHELL-CONNECT-POLICY's Revocation UX section — which is semantically equivalent
  to first-load denial for the purposes of this test.
- **CSP Header:** `connect-src 'none'` in the HTTP response header — the strict
  baseline. No relaxation, no approved origins, no residual meta-CSP (which is
  harmless under Class-1 per NAP-CLASS-1.md but SHOULD NOT be present in a
  shell-served HTML anyway).
- **Meta Tag Convention:** Either empty-content (`content=""`) OR absent. Shell
  MUST NOT emit the granted variant (`napplet-connect-granted` with a non-empty
  content) under denial — that would cross-signal-disagree with the
  `connect-src 'none'` header and cause the napplet to believe it has a grant
  the browser will not honor.

Follow [SHELL-CLASS-POLICY.md](../../../../../specs/SHELL-CLASS-POLICY.md) for
class-side preconditions:

- **`class.assigned` wire** sent AFTER shim bootstrap ready signal, BEFORE the
  napplet's first `DOMContentLoaded` handler.
- **Cross-NAP Invariant:** `class: 1` sent because `connect.granted === false`
  at the moment the envelope was dispatched (scenario table row 2 — denied
  Class-2 prompt).

## References

- **NAP-CONNECT** (napplet/naps) — Graceful Degradation section (napplet MUST
  see `{granted: false, origins: []}` when meta is absent or empty; never
  `undefined`).
- **NAP-CLASS-1.md** (napplet/naps) — default strict-baseline posture; CSP
  `connect-src 'none'`.
- [SHELL-CONNECT-POLICY.md](../../../../../specs/SHELL-CONNECT-POLICY.md) —
  Grant Persistence, Revocation UX.
- [SHELL-CLASS-POLICY.md](../../../../../specs/SHELL-CLASS-POLICY.md) —
  Cross-NAP Invariant scenario table (Row 2: User denies Class-2 prompt).
- `packages/nap/src/connect/shim.ts` — graceful-degradation default branch.
- `packages/nap/src/connect/shim.test.ts` — in-repo coverage of the
  degradation-default contract that this Playwright test verifies end-to-end.
