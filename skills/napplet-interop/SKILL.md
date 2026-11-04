---
name: napplet-interop
description: Use when a napplet talks to other napplets or handles shell navigation history - NAP-INC topics (inc.emit / inc.on), NAP-INTENT dispatch (intent.invoke / intent.open), archetype manifest metadata, and the stable queryless convention identity rule (napplet:<archetype>/<intent>). Covers the emit-only query shorthand, payload validation, and what must stay exact-match. Skip for napplets that never emit, subscribe, dispatch, or report intent-based navigation.
---

# Inter-Napplet Conventions (INC, INTENT, archetypes)

Load this only when the design spec names a cross-napplet feature: opening a note/profile/DM in another napplet, exposing an archetype role, broadcasting to sibling napplets, or reporting intent-based navigation history. Protocol truth is the living [NAP-INC](https://github.com/napplet/naps/blob/master/naps/NAP-INC.md) (draft history in [PR #89](https://github.com/napplet/naps/pull/89)) and [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md) documents. If a needed behavior is not there, flag the gap; do not invent it.

## Convention identity

One convention is one stable, **queryless** string: `napplet:<archetype>/<intent>`, e.g. `napplet:note/open`, `napplet:profile/open`, `napplet:dm/open`. It is an identifier, not a payload schema and not a version.

- Subscriptions, manifest discovery, and handler routing use **exact** matching on that identity. No query parsing, prefix, wildcard, canonicalization, payload-schema, or multi-convention matching anywhere in those paths.
- Never put query text in manifest metadata or in a subscription topic.
- Payload shape is a local choice per convention. Every received payload is untrusted: validate it against the real upstream convention when one exists; never infer a schema from the topic name and never recreate numbered payload contracts.

## Archetype metadata (manifest)

A napplet that fulfils an archetype role advertises one contract per entry through the vite-plugin `archetypes` option, which the CLI's `napplet init --archetype napplet:<archetype>/<intent>` also records in `.napplet/config.yaml`:

```ts
archetypes: [{ slug: 'note', convention: 'napplet:note/open' }],
```

This emits the manifest tag `["z", "note"]` and `["i", "napplet:note/open"]`. The convention's archetype segment matches a `z` role on the same manifest for dispatch eligibility; trailing `i` values advertise parameter names. Do not add payload, version, or negotiation fields.

## NAP-INC — broadcast between napplets

```ts
import { inc } from '@napplet/sdk';

inc.emit('napplet:profile/open', { pubkey: 'abc123' });

const sub = inc.on('napplet:profile/open', (event) => {
  if (!isValidProfileOpenPayload(event.payload)) return;   // untrusted input
  openProfile(event.payload);
});
sub.close();
```

`inc.on` delivers one `IncEvent` with the exact topic, a runtime-attested sender, and an optional payload.

### Emit-only query shorthand

Outbound `inc.emit(topic, payload?)` may take a queried convention URI as developer shorthand:

```ts
inc.emit('napplet:profile/open?pubkey=abc123');
// runtime sends { type: 'inc.emit', topic: 'napplet:profile/open', payload: { pubkey: 'abc123' } }
```

The runtime percent-decodes the shallow text query into the payload (`+` stays a literal plus) and routes the **queryless** topic, which subscribers match exactly. This is outbound preprocessing only, not a routing rule. These throw synchronously: a fragment, malformed percent encoding, a repeated decoded name, and a query combined with an explicit payload. For structured or non-text data use a queryless topic plus an explicit payload object.

The deprecated `ifc` SDK subpath is only an INC compatibility alias; new code imports `inc`.

## NAP-INTENT — ask the shell to route an action

```ts
import { intent } from '@napplet/sdk';

const result = await intent.open('napplet:profile/open', { payload: { pubkey: 'abc123' }, behavior: { reuse: false } });
if (!result.ok) showIntentError(result.error);
```

- Dispatch with `intent.invoke(uri, options?)` or the `intent.open(uri, options?)` convenience.
- An `ok: true` result accepts delivery responsibility; failures contain `error`. Targets register `onDelivery` and validate the runtime-attested payload. Behavior hints: `focus`, `reuse`.
- The URI derives archetype and action; target delivery is independent of INC and source lifetime.

## Spec lines to fill in

Add these to the `napplet-design` spec when interop is in scope:

```
archetype metadata: <none | slug + napplet:<archetype>/<intent>>
INC topics: <none | exact topic(s) emitted / subscribed + payload validation source>
intent dispatch: <none | invoke/open request + how acceptance and onDelivery drive the UI>
```

## Pitfalls

- Subscribing to a queried topic (`inc.on('napplet:profile/open?pubkey=…')`) — never matches; subscribe to the queryless identity.
- Treating a topic as a schema (`if (topic.endsWith('/open')) payload.pubkey…`) — validate the payload itself.
- Adding `inc` or `intent` to manifest `requires` for an optional handoff — gate on `window.napplet?.inc` / `?.intent` and hide the affordance when absent.
- Assigning delivery identifiers in napplet code or inventing acknowledgement lifecycles and version negotiation. The runtime assigns `IntentDelivery.id` under the [delivery draft](https://github.com/napplet/naps/pull/128); the invoking napplet receives acceptance, not a completion receipt.

## NAP-NAVIGATION — report committed views

The [NAP-NAVIGATION draft](https://github.com/napplet/naps/pull/126) depends on the [NAP-INTENT delivery draft](https://github.com/napplet/naps/pull/128). A delivery carries runtime-assigned `id`; `sender` is an authenticated source catalog ID or `null` for shell-originated delivery. The ID is endpoint-scoped correlation, not authority. When that delivery causes a committed transition, report its ID as `deliveryId` through `navigation.report`. Keep it attached to that transition's serialized work, never global "last intent" state or payload fields.

Advertise each retained convention and its parameter names. Report only one committed `location`, not an index or history list; use `null` for a view that cannot be represented. The runtime chooses the exact retained visit for Back/Forward, including duplicate invocations. A guard that declines may reaffirm unchanged state with a newer `replace` report without the declined delivery ID. Handle redirects and late commits by reporting actual state. New reports always advance revision, including after rejection; retries preserve revision and content. Do not replay irreversible actions as history locations.
