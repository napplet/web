# @napplet/boilerplate

> Project-only generator behind `napplet create`.

`@napplet/boilerplate` is the package-backed generator used by the primary CLI. It clones the
[`github.com/napplet/boilerplate`](https://github.com/napplet/boilerplate)
template — a Vite + TypeScript napplet starter — and derives the package name
from the destination. Deployment name, title, description, and archetypes are
owned later by `napplet init`.

- **npm:** [`@napplet/boilerplate`](https://www.npmjs.com/package/@napplet/boilerplate)
- **Source:** [packages/boilerplate](https://github.com/napplet/napplet/tree/main/packages/boilerplate)

## Usage

```bash
napplet create my-napplet
```

It currently ships one variant, `basic`, but keeps a `--variant` option so future
templates can be added without changing the command shape.

## Direct package route

The package can still be invoked directly for generator development or custom
template testing:

```bash
npx @napplet/boilerplate ./my-napplet --yes
```

## Options

| Option | Purpose |
| --- | --- |
| `--variant <name>` | Template variant. Currently `basic`. |
| `--template <path-or-url>` | Override the template source (useful for local verification). |
| `--yes`, `-y` | Use `./my-napplet` when the destination is omitted. |
| `--force` | Allow generation into a non-empty directory. |

By default the CLI clones `https://github.com/napplet/boilerplate.git`.

## See also

- [Getting started](/guide/getting-started) — scaffold and run your first napplet
- [`@napplet/vite-plugin`](./vite-plugin) — the manifest plugin the template wires up
