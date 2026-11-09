# KEYS

Keyboard bindings and action registration — the shell binds keys to named actions.

```ts
await window.napplet.keys.registerAction({ id: 'editor.save', label: 'Save', defaultKey: 'Ctrl+S' });
const sub = window.napplet.keys.onAction('editor.save', () => save());
```

This non-normative guide defers to the living [NAP-KEYS proposal](https://github.com/napplet/naps/pull/9). Feature-gate with `if (window.napplet?.keys)` before use; the runtime injects only available domains. Typed helpers ship from [`@napplet/nap/keys`](/packages/nap) and [`@napplet/sdk`](/packages/sdk).
