# LINK

Shell-mediated external link opening. This is user-visible navigation, not byte fetching; the shell owns prompting, policy, opener isolation, and browser context.

```ts
if (window.napplet?.link) {
  const result = await window.napplet.link.open('https://example.com/post/123', {
    label: 'Read post',
  });
  if (result.status === 'denied') showInlineFallback();
}
```

This non-normative guide defers to the living [NAP-LINK proposal](https://github.com/napplet/naps/pull/53). Feature-gate with `if (window.napplet?.link)` before use; the runtime injects only available domains. Typed helpers ship from [`@napplet/nap/link`](/packages/nap) and [`@napplet/sdk`](/packages/sdk).
