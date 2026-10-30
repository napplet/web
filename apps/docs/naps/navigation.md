# NAVIGATION

This is non-normative implementation guidance for the [NAP-NAVIGATION draft](https://github.com/napplet/naps/pull/126) and its companion [NAP-INTENT delivery draft](https://github.com/napplet/naps/pull/128). The living proposals define the contract. The package implements the companion delivery proposal even though its PR is closed and unmerged; integrations need the same draft contract.

A napplet reports the view it has committed. The runtime keeps that instance's history, assigns visit IDs, and chooses the current position. Back/Forward delivers a retained invocation through the same intent handler that handles other requests. Merely delivering an intent never moves the history position.

## Availability and declarations

Navigation requires INTENT. The maintained runtime prelude exposes navigation only when both domains are explicitly selected; it does not grant a missing dependency. Check both injected objects when history is optional, and declare both optional domains in the manifest. When the core task requires them, declare both in `requires` instead. No SHELL readiness exchange is needed.

```ts
// Options for the existing manifest plugin:
optional: ['navigation', 'intent'],
archetypes: [{
  slug: 'profile',
  convention: 'napplet:profile/open',
  params: ['pubkey'],
}],
```

Each retained location uses an exactly matching advertised queryless, fragment-free convention. Its payload is a JSON map containing only advertised parameter names. Names are an allowlist, not required fields or value schemas; application code still validates convention semantics. Multiple advertisements remain separate allowed formats rather than one union of their parameter names. Do not retain irreversible actions such as sending a payment as history locations.

## Report a committed location

The SDK root and `@napplet/sdk/navigation` export `navigation`. Both methods return `Promise<NavigationResult>`:

| Method | Use |
| --- | --- |
| `navigation.report(report)` | Report the initial or subsequent committed location. |
| `navigation.get()` | Read this instance's complete retained history and status. |

The root also exports `navigationReport` and `navigationGet`. The navigation subpath exports those names and the `report` / `get` aliases. `@napplet/nap/navigation/sdk` offers the same named helpers and aliases.

```ts
import { navigation } from '@napplet/sdk/navigation';
import type { NavigationLocation, NavigationReport } from '@napplet/core';

let revision = 0; // Keep this counter for the entire instance lifetime.

async function reportCommitted(location: NavigationLocation | null, deliveryId?: string) {
  const details = {
    revision: ++revision,
    ...(deliveryId === undefined ? {} : { deliveryId }),
  };
  const report: NavigationReport = location === null
    ? { ...details, location: null }
    : { ...details, location };
  const result = await navigation.report(report);
  if (!result.ok) {
    // Repair the report from actual state, then submit a newer revision.
    console.error(result.error.code, result.error.message);
  }
  return result;
}

if (window.napplet?.navigation && window.napplet?.intent) {
  // After committing the corresponding profile view:
  await reportCommitted({
    convention: 'napplet:profile/open',
    payload: { pubkey: 'a'.repeat(64) },
    title: 'Alice',
  });
}
```

Serialize router transitions and their reports. Do not reset the revision counter when a component remounts, wrap it, or reuse a rejected revision with different content. Every new report advances beyond all revisions the instance has produced, including rejected reports. Only an identical retry reuses its revision and content; that retry does not append a visit or clear pending/uncertain state.

Use `mode: 'replace'` on a non-null report to update the selected visit without changing its ID. The default is `push`, which records a new visit and discards forward entries after the selected position. Report `location: null` without `mode` when no eligible invocation represents the committed view. That preserves history with no selected entry. A title is plain-text display metadata, separate from the intent payload.

## Handle a history revisit

Use `intent.onDelivery` and the normal payload validation and navigation guard. The target receives a runtime-assigned delivery `id`, separate from request-envelope IDs and visit IDs. `sender` is a catalog identifier for another napplet, or `null` for a shell-originated request. Neither value grants authority or proves the payload is safe.

Keep the delivery object attached to its own serialized transition. After that transition commits, pass `delivery.id` to `reportCommitted(actualLocation, delivery.id)`. Do not store a global "last delivery" value: unrelated or delayed work could then claim the wrong transition. No navigation fields belong in the convention payload.

A matching correlated report selects the exact existing visit and preserves forward history, even when multiple visits have equal invocation values. A redirect reports the actual resulting location. If a guard declines, it may reaffirm the unchanged location using a newer `replace` report without the declined delivery ID. Cancel superseded asynchronous transitions where possible; if a late transition commits, report its actual state. A settled old delivery cannot retroactively select its earlier visit.

## Read and recover

`result.view` contains the complete retained `entries`, current `index` (or `null`), last accepted `reportRevision` (or `null`), and status: `unreported`, `current`, `pending`, or `uncertain`. A null index is not an earlier entry still being current. `current` records an accepted report; it does not independently prove what rendered.

Domain rejection resolves to `ok: false`, a view, and an error code: `invalid`, `unsupported`, `stale`, `denied`, or `limit`. Inspect that result. A newer rejected report can leave history uncertain; recover with a valid newer report of the actual committed state before relying on shell history. Transport timeout or disposal rejects the promise instead of returning a domain result.

The runtime owns retention, size limits, and a finite traversal timeout. `get()` reads that runtime state rather than inspecting the iframe router. Native location, hash, and History API changes do not report navigation automatically. Navigation does not replace the verified `srcdoc` artifact, navigate the iframe to a URL, or add a second dispatcher, listener, or outcome operation.
