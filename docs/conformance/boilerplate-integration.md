# Wiring conformance into the boilerplate template

The `npx @napplet/boilerplate` generator scaffolds from a **separate** repository,
[`github.com/napplet/boilerplate`](https://github.com/napplet/boilerplate). The
generated napplet should ship a `test:conformance` script out of the box so every
boilerplate-derived napplet can run `pnpm test:conformance` (or the npm / yarn / bun
equivalent) immediately.

The generator in this repo (`packages/boilerplate`) copies the template verbatim and
only rewrites the package name, napplet type, and title — it does not inject scripts.
So the change below must be applied to the **template repo**, not here. Apply it once;
every future generated napplet then inherits it.

## Diff to apply to `github.com/napplet/boilerplate`

### `package.json`

```diff
   "scripts": {
     "dev": "vite",
     "build": "vite build",
     "preview": "vite preview",
-    "verify": "tsc --noEmit"
+    "verify": "tsc --noEmit",
+    "test:conformance": "napplet-conformance ./dist"
   },
   "devDependencies": {
+    "@napplet/conformance-cli": "^0.1.0",
     "@napplet/shim": "^0.x",
     "@napplet/vite-plugin": "^0.x",
     "typescript": "^5.9.3",
     "vite": "^6.x"
   }
```

`napplet-conformance` is package-manager agnostic — `pnpm test:conformance`,
`npm run test:conformance`, `yarn test:conformance`, and `bun run test:conformance`
all resolve the bin from `@napplet/conformance-cli`.

### CI workflow (`.github/workflows/ci.yml` in the template)

```yaml
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      # Conformance needs Playwright's Chromium:
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:conformance
```

### README note (template)

> ## Verify conformance
>
> ```bash
> pnpm build
> pnpm test:conformance
> ```
>
> This loads the build into a real `sandbox="allow-scripts"` iframe and fails on any
> malformed envelope, manifest problem, boot failure, or forbidden-global reference —
> so you catch protocol bugs before publishing. For a visual report, load the build in
> the conformance web runtime.

## Optional generator nicety (this repo)

`packages/boilerplate/src/index.ts` prints a "Next / Verify" block on success. Once the
template ships `test:conformance`, that block can mention it:

```diff
 Verify:
-  pnpm verify
+  pnpm verify
+  pnpm build && pnpm test:conformance
```

This is cosmetic; the substantive wiring lives in the template repo.
