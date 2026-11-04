# CONFIG

Declarative per-napplet configuration (JSON Schema-driven). The shell renders the settings UI, validates, persists, and pushes live values; the shell is the sole writer.

```ts
const sub = window.napplet.config.subscribe((values) => applyTheme(values.theme as string));
window.napplet.config.openSettings({ section: 'appearance' });
```

This non-normative guide defers to the living [NAP-CONFIG proposal](https://github.com/napplet/naps/pull/14). Feature-gate with `if (window.napplet?.config)` before use; the runtime injects only available domains. Typed helpers ship from [`@napplet/nap/config`](/packages/nap) and [`@napplet/sdk`](/packages/sdk).
