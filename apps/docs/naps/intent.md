# INTENT

Intent calls derive archetype and action from the URI. An `ok: true` result means the runtime accepted delivery responsibility and includes the normalized identity and handler catalog identifier; an `ok: false` result includes `error`. Targets receive runtime-attested `IntentDelivery` values through `onDelivery`, including deliveries retained before registration. Behavior hints are `focus` and `reuse`.

```ts
if (window.napplet?.intent) {
  const { available } = await window.napplet.intent.available('profile');
  if (available) {
    const result = await window.napplet.intent.open('napplet:profile/open', { payload: { pubkey: 'abc123' }, behavior: { reuse: false } });
    if (!result.ok) console.error(result.error);
  }
}
```

This non-normative guide defers to the living [NAP-INTENT proposal](https://github.com/napplet/naps/pull/91). Feature-gate with `if (window.napplet?.intent)` before use; the runtime injects only available domains. Typed helpers ship from [`@napplet/nap/intent`](/packages/nap) and [`@napplet/sdk`](/packages/sdk).

## Delivery and recommendations

```ts
import { intent } from '@napplet/sdk';

intent.onDelivery(({ sender, convention, payload }) => {
  console.log(sender, convention, payload);
});
await intent.invoke('napplet:profile/open?pubkey=abc123');
```

The runtime binding retains deliveries until a listener registers. Discovery candidates expose opaque catalog `id` values and `contracts` with parameter names. [INC](./inc) peers instead use identifiers for running authenticated endpoints. A NAP-INTENT URI may append a bare `#naddr1…` recommendation; the binding sends its coordinate and relay hints as `handlerHint`, outside convention identity and payload. An applicable user default takes precedence. INC URI operations reject fragments. See the living [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md) and [web projection](https://github.com/napplet/naps/blob/master/projections/web.md).
