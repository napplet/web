# CVM

Native ContextVM bridge — MCP-over-Nostr (`discover` / `listTools` / `callTool` / `listResources` / `readResource` / `registry.*`); the shell owns transport, registry selection, and tool policy.

```ts
if (window.napplet?.cvm) {
  const servers = await window.napplet.cvm.discover({ search: 'relay' });
  const tools = await window.napplet.cvm.listTools(servers[0]);
  const result = await window.napplet.cvm.callTool(servers[0], tools[0].name, {});
}
```

This non-normative guide defers to the living [NAP-CVM proposal](https://github.com/napplet/naps/pull/31). Feature-gate with `if (window.napplet?.cvm)` before use; the runtime injects only available domains. Typed helpers ship from [`@napplet/nap/cvm`](/packages/nap) and [`@napplet/sdk`](/packages/sdk).

Registry helpers accept a selector object in both `window.napplet.cvm.registry` and `cvm.registry` from `@napplet/sdk`. The named `cvmRegistryHas`, `cvmRegistryDescribe`, and `cvmRegistryCall` helpers use the same arguments.

```ts
import { cvm } from '@napplet/sdk';

const available = await cvm.registry.has({ family: 'relatr' });
if (available) {
  const entry = await cvm.registry.describe({ family: 'relatr' });
  const tool = entry.tools[0];
  const result = await cvm.registry.call(
    { schemaHash: tool.schemaHash },
    tool.name,
    { q: 'jack' },
    { cache: 'reload' },
  );
}
```

Migration from the earlier family API: replace `registry.has('relatr')` with `registry.has({ family: 'relatr' })`, and do the same for `describe` and `call`. String arguments are no longer supported. Move an old `options.schemaHash` pin into `selector.schemaHash`; `options.server` still pins the provider. When both selector fields are supplied, the hash is authoritative and the family label does not restrict it. Returned entries expose `schemaHashes`, each tool has its own required `schemaHash`, and an entry's `family` label may be absent. `registry.list` also accepts a `category` discovery hint. Provider selection and schema verification remain shell responsibilities; see the living proposal for their requirements.
