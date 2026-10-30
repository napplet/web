# MESH: circle messaging

This is a non-normative package guide for the proposed [NAP-MESH draft](https://github.com/napplet/naps/pull/122). The living proposal owns the operation, wire, and security contracts; [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303) defines the web binding. Draft behavior may change.

MESH sends events through the user's deliberately paired circle. A circle hop follows a pairing between people, regardless of how many transport links connect their devices. Nearby strangers are not members. Use MESH when that circle is the intended audience, such as a household doorbell or a game between friends' devices. Ordinary social reads and publishes remain OUTBOX-first.

## Availability and imports

The SDK wraps the host's injected `window.napplet.mesh` object. It does not implement a peer transport or create a circle. Check domain presence before using an optional integration:

```ts
import { mesh } from '@napplet/sdk';

if (window.napplet?.mesh) {
  const info = await mesh.info();
  console.log(info.online, info.peers, info.limits);
} else {
  // Disable the circle feature or render its fallback.
}
```

An available domain can report `online: false`. That is an offline circle, not an unavailable API. `info()` rejects if the host cannot query the circle at all.

The subpath `@napplet/sdk/mesh` exports the same `mesh` object and named `info`, `publish`, `subscribe`, and `blobs` helpers. `@napplet/nap/mesh/sdk` provides `meshInfo`, `meshPublish`, `meshSubscribe`, and `meshBlobs`; its sibling `/types` and `/shim` exports serve type consumers and runtime authors.

Declare `optional: ['mesh']` in the Vite plugin when the core task works without circle delivery. Use `requires: ['mesh']` when it does not. Declarations do not grant access. A host selects `mesh` in its runtime prelude allowlist and supplies the circle backend.

The remaining examples assume the `mesh` domain is available.

## Publish with a hop budget

```ts
import { publish } from '@napplet/sdk/mesh';

const result = await publish(
  { kind: 20666, content: 'ding', tags: [['t', 'doorbell']] },
  { ttl: 2 },
);
if (result.ok) {
  console.log(result.eventId, result.ttl);
} else {
  console.error(result.error);
}
```

The host signs the template as the user. `ttl` is a whole number from 0 through 255; the host clamps it to the user's publish cap and reports the effective value. Omission means the user's cap. Explicit `ttl: 0` publishes on this device only, including delivery to local live subscriptions. It does not mean “use the default.”

Hop budgets travel outside the signed event. The host owns forwarding, deduplication, and persistence. Ephemeral events such as this doorbell example are delivered without being retained as backlog. Publishing to the circle does not also publish to public relays.

## Subscribe through local backlog and live events

```ts
import { subscribe } from '@napplet/sdk/mesh';

const subscription = subscribe(
  { kinds: [9], '#h': ['kitchen'] },
  { ttl: 1 },
);
subscription.on('event', (result) => {
  console.log(result.event);
});
subscription.on('eose', (ttl) => {
  console.log('Local backlog complete; effective backlog TTL:', ttl);
});
subscription.on('closed', (reason) => {
  console.log('Circle subscription ended:', reason);
});

// Call when this view is disposed, not when EOSE arrives.
function dispose() {
  subscription.close();
}
```

Pass one filter or a list of filters. Subscription `ttl` controls the reach of the backlog request; it does not limit the lifetime of the live stream. Zero asks no members for backlog. Omission uses the user's subscribe cap, which can differ from the publish cap.

`eose` marks the end of this device's backlog only. Members' backlog may arrive before or after it, and live deliveries continue afterward. Keep the subscription open until disposal or a `closed` delivery. Both an initial refusal and a later host closure surface through `closed`. Consumers should tolerate duplicate events.

## Count available blobs

```ts
import { blobs } from '@napplet/sdk/mesh';

const hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const availability = await blobs([hash]);
console.log(availability.peers, availability.blobs[hash]);
```

Pass at most 64 SHA-256 hex hashes. The result maps lowercase hashes to counts of reachable members holding them. It downloads nothing and reports no member identities or addresses. Offline results contain zero peers and zero counts; a host that cannot probe blobs reports an error, which rejects the promise.

## Host responsibilities and verification scope

The package binding carries requests and deliveries over the existing NIP-5D boundary. The host implements pairing, authorization, signing, event storage, forwarding limits, bounded backlog requests, and bounded circle-only blob probes. Neither SDK availability nor a manifest declaration proves that those host behaviors work.

The conformance reference responses are deterministic fixtures. Tests of the binding and envelopes do not prove real peer reachability, offline persistence, forwarding, or revocation; verify those against the target host's circle implementation.
