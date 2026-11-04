# SHELL

The runtime may expose `shell` for environment information. `shell.supports(domain)` reads current domain object presence, `shell.services` is empty until environment delivery, and `shell.ready()` / `shell.onReady(handler)` use the retained snapshot. Readiness does not gate other domain calls. See the living [NAP-SHELL](https://github.com/napplet/naps/blob/master/naps/NAP-SHELL.md).

```ts
if (window.napplet?.shell) {
  if (window.napplet.shell.supports('storage')) enableDrafts();
  const sub = window.napplet.shell.onReady((environment) => {
    console.log(environment.services);
  });
}
```

Named helpers `shellSupports`, `shellReady`, and `shellOnReady` are exported from `@napplet/nap/shell`.

This non-normative guide defers to the living [NAP-SHELL proposal](https://github.com/napplet/naps/pull/101). Feature-gate with `if (window.napplet?.shell)` before use; the runtime injects only available domains. Typed helpers ship from [`@napplet/nap/shell`](/packages/nap) and [`@napplet/sdk`](/packages/sdk).
