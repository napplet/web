---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/shim": minor
"@napplet/sdk": minor
---

Add the NAP-THEME shim and SDK so napplets can actually read the shell theme.

`theme` previously shipped types only — it defined the `theme.get` /
`theme.get.result` / `theme.changed` wire protocol but no runtime, so a napplet
had no way to fetch the theme through `window.napplet`. It now mirrors the
read-only `identity` NAP:

- `window.napplet.theme.get()` resolves the current `Theme` (colors, optional
  fonts, background media, and title).
- `window.napplet.theme.onChanged(handler)` fires on shell-pushed `theme.changed`
  updates.
- New entry points `@napplet/nap/theme/shim` and `@napplet/nap/theme/sdk`, plus
  `themeGet` / `themeOnChanged` / `installThemeShim` re-exported from
  `@napplet/sdk`, and `theme` added to the `NappletGlobal` type in `@napplet/core`.
