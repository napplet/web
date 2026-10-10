# @napplet/boilerplate

> Project-only generator behind `napplet create`.

`@napplet/boilerplate` is the package-backed generator used by the primary CLI. It clones the [`github.com/napplet/boilerplate`](https://github.com/napplet/boilerplate) template — a Vite + TypeScript napplet starter — and derives the package name from the destination. Deployment name, title, description, and archetypes are owned later by `napplet init`.

- **npm:** [`@napplet/boilerplate`](https://www.npmjs.com/package/@napplet/boilerplate)
- **Source:** [packages/boilerplate](https://github.com/napplet/napplet/tree/main/packages/boilerplate)

## Usage

```bash
napplet create my-napplet
```

It currently ships one variant, `basic`, but keeps a `--variant` option so future templates can be added without changing the command shape.

## Direct package route

The package can still be invoked directly for generator development or custom template testing:

```bash
npx @napplet/boilerplate ./my-napplet --yes
```

## Programmatic CLI API

`runCli(argv)` is the import-safe generator entry point used by the standalone CLI. It returns `0` on success or `1` after emitting the same `@napplet/boilerplate:` diagnostic as the package binary.

```ts
import { runCli } from '@napplet/boilerplate';

const status = await runCli(['my-napplet', '--template', './template']);
```

## Options

| Option | Purpose |
| --- | --- |
| `--variant <name>` | Template variant. Currently `basic`. |
| `--template <path-or-url>` | Override the template source (useful for local verification). |
| `--yes`, `-y` | Use `./my-napplet` when the destination is omitted. |
| `--force` | Allow generation into a non-empty directory. |

By default the CLI clones `https://github.com/napplet/boilerplate.git`.

## Deployment metadata boundary

The generated project leaves archetype metadata to `napplet init`. Each manifest archetype tag advertises one complete queryless `napplet:<archetype>/<intent>` identity:

```json
["z", "profile"]
["i", "napplet:profile/open"]
```

Intent calls derive archetype and action from the URI. An `ok: true` result means the runtime accepted delivery responsibility and includes the normalized identity and handler catalog identifier; an `ok: false` result includes `error`. Targets receive runtime-attested `IntentDelivery` values through `onDelivery`, including deliveries retained before registration. Behavior hints are `focus` and `reuse`. This non-normative guidance defers to the living [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md).

This non-normative guide defers to the living [NAP-INC](https://github.com/napplet/naps/blob/master/naps/NAP-INC.md), [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md), and [web projection](https://github.com/napplet/naps/blob/master/projections/web.md).

## See also

- [Getting started](/guide/getting-started) — scaffold and run your first napplet
- [`@napplet/vite-plugin`](./vite-plugin) — the manifest plugin the template wires up
