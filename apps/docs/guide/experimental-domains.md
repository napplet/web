# Experimental domains

This page is non-normative. The living [NIP-5D proposal](https://github.com/nostr-protocol/nips/pull/2303) and the [NAPs track](https://github.com/napplet/naps) define the protocol; nothing here adds a domain, message type, or manifest field to it.

NIP-5D says "a NAP named `foo` owns all `foo.*` types" and that `R` / `O` manifest tags name "one bare NAP domain". It doesn't limit domains to the NAPs this toolchain bundles. That leaves room to prototype a capability before proposing it: a runtime can expose an experimental `window.napplet.<domain>` object, and the build and conformance tools can be told to accept it. Every experimental domain is something you name yourself. It stays non-standard, and other shells won't support it, until it's proposed and accepted on the NAPs track. Propose it there before anything depends on it.

## Rules every package applies

- The name must be a bare domain: no whitespace, no `.`, no `:`, and not a `NAP-` document name.
- It can't reuse a bundled NAP domain such as `relay`, and it can't shadow an `Object.prototype` member such as `constructor`.
- Nothing is experimental by default. Each package only accepts the names you list.

## Runtime (`@napplet/shim`)

A shell registers an extension, then lists its domain in the `domains` it exposes. The object appears only when both are true, so the namespace still contains only what the shell exposes. The extension never receives the port: its channel sends and receives `<domain>.*` envelopes only.

```ts
import { installNappletRuntimePrelude, registerNappletRuntimeExtension } from '@napplet/shim/prelude';

registerNappletRuntimeExtension({
  domain: 'mesh',
  create: (channel) => ({
    publish: (topic: string) => channel.send({ type: 'mesh.publish', topic }),
    onMessage: (listener: (message: unknown) => void) => channel.onMessage(listener),
  }),
});

installNappletRuntimePrelude({ domains: ['relay', 'mesh'] });
```

For `srcdoc` injection with the `prelude.global` artifact, run the registration between the prelude and the activation call. The activation call removes `NappletShimPrelude`, so the order is: CSP `meta`, prelude artifact, `NappletShimPrelude.registerExtension(...)`, `NappletShimPrelude.install({ domains: [...] })`, then napplet content. Experimental names bypass the maturity policy, because listing them is already an opt-in. The install-all default never mounts one.

## Napplet (`@napplet/sdk`)

Presence is the only availability signal, so read the object and degrade when it's missing:

```ts
import { experimentalDomain } from '@napplet/sdk';

const mesh = experimentalDomain<{ publish(topic: string): void }>('mesh');
mesh?.publish('hello');
```

## Build (`@napplet/vite-plugin`, `napplet` CLI)

Pass `experimentalDomains: ['mesh']` to the plugin. Reads of `window.napplet.mesh` are inferred like NAP domains, and declared experimental domains go into `R` / `O` without the unknown-domain warning. The plugin warns once that they aren't NAP-defined. The CLI already publishes `R` / `O` tags as declared, so it needs no option.

## Conformance

```sh
napplet-conformance ./dist --strict --experimental-domain mesh --extension ./mesh-extension.js
```

`--experimental-domain` (repeatable) allowlists the name for the boot, the envelope and manifest validators, and `--strict`. `--extension` injects your registration script before activation, so the domain object exists during the run. Without it, the allowlisted domain is accepted on the wire, but the napplet sees no object and should degrade. The degraded pass never exposes experimental domains. The reference shell has no responders for them, so requests get no reply. The web runtime takes names only, as `?experimental=mesh`. In code, `bootAndCollect({ experimentalDomains, experimentalEnvelopeSpecs, extensionSource })`, `validateEnvelope(message, { experimentalDomains })`, and `validateManifestEvent(event, { experimentalDomains })` take the same allowlist.
