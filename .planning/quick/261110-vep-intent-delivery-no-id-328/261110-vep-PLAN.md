---
quick_id: 261110-vep
description: Align IntentDelivery with the no-ID NAP-INTENT contract (napplet/web#328)
date: 2026-11-10
---

# Align IntentDelivery with the no-ID NAP-INTENT contract

Sources: NAP-INTENT napplet/naps#128 @ 74f9bf85 ("No intent delivery identifier is exposed"; replay sender is the target's own catalog id), NAP-NAVIGATION napplet/naps#126 @ 9a4b179e (d929d45: revisits settle on the first accepted report above the recorded revision, matched by value).

1. core: drop `IntentDelivery.id`, make `sender: string`, drop `NavigationReport.deliveryId`.
2. nap intent binding: accept only deliveries with a non-empty string sender.
3. conformance reference shell: remove delivery-ID issuance, retry and correlation; replay with the target's catalog id; settle by revision and value; reject a `deliveryId` report field.
4. Tests, docs, skills, changeset (core/nap/conformance minor).
