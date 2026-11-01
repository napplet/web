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
