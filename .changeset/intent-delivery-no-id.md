---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/conformance": minor
---

Align intent delivery with the revised NAP-INTENT and NAP-NAVIGATION drafts, which withdrew delivery identifiers and the nullable shell sender.

- `IntentDelivery` drops `id`, and `sender` is a required `string` again. A shell replay to a selected instance is an ordinary delivery whose `sender` is the target's own catalog identifier.
- `NavigationReport` drops `deliveryId`. A pending revisit settles on the first accepted report above the revision the runtime recorded at dispatch, matched by value.
- The `@napplet/nap/intent` binding ignores deliveries without a non-empty string `sender`.
- The conformance reference shell no longer assigns delivery IDs, and rejects a report carrying `deliveryId` as `invalid`. `deliverIntent` replays with the endpoint's own catalog identifier, `retryIntent` is removed, and `failNavigationDelivery(endpointId, definite?)` no longer takes a delivery ID.
