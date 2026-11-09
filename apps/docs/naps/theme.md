# THEME

Read-only shell theme access — colors, fonts, background, and title. The shell owns theming; the napplet reads it and reacts to changes.

```ts
const theme = await window.napplet.theme.get();
document.body.style.background = theme.colors.background;
const sub = window.napplet.theme.onChanged((t) => applyTheme(t));
```

This non-normative guide defers to the living [NAP-THEME proposal](https://github.com/napplet/naps/pull/103). Feature-gate with `if (window.napplet?.theme)` before use; the runtime injects only available domains. Typed helpers ship from [`@napplet/nap/theme`](/packages/nap) and [`@napplet/sdk`](/packages/sdk).

## Updates and fallbacks

Theme updates reach napplets with the exposed `theme` domain, independently of manifest requirement declarations. Theme media URLs do not grant network access, so colors and local fonts provide the fallback. See the living [NAP-THEME](https://github.com/napplet/naps/blob/master/naps/NAP-THEME.md).
