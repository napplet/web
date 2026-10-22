# Deferred Items

## 162-01

- `pnpm dlx aislop@0.12.0 scan --changes --base origin/main .` reports an unused `randomBytes` import in `.planning/spikes/001-blossom-build-optimization/prototype.mjs` and known dependency advisories for `js-yaml`, `nanoid`, and `postcss` in the unowned root dependency set. These pre-date and are outside the Plan 162-01 Vite-plugin implementation; no unrelated changes were made.
