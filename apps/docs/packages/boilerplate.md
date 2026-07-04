# @napplet/boilerplate

> Interactive generator for the `github.com/napplet/boilerplate` template.

`@napplet/boilerplate` is an `npx`-runnable generator. It clones the
[`github.com/napplet/boilerplate`](https://github.com/napplet/boilerplate)
template — a Vite + TypeScript napplet starter — and asks where to create the
project, which package name to use, and which NIP-5D napplet type to write into
the Vite manifest config.

- **npm:** [`@napplet/boilerplate`](https://www.npmjs.com/package/@napplet/boilerplate)
- **Source:** [packages/boilerplate](https://github.com/napplet/napplet/tree/main/packages/boilerplate)

## Usage

```bash
npx @napplet/boilerplate
```

It currently ships one variant, `basic`, but keeps a `--variant` option so future
templates can be added without changing the command shape.

## Non-interactive

Pass everything as flags to skip the prompts:

```bash
npx @napplet/boilerplate ./my-napplet \
  --package-name my-napplet \
  --napplet-type my-napplet
```

## Options

| Option | Purpose |
| --- | --- |
| `--variant <name>` | Template variant. Currently `basic`. |
| `--template <path-or-url>` | Override the template source (useful for local verification). |
| `--package-name <name>` | The `package.json` package name. |
| `--napplet-type <type>` | The `nappletType` written to `vite.config.ts`. |
| `--title <title>` | App title written to `index.html` and the README heading. |
| `--yes`, `-y` | Accept defaults and skip prompts. |
| `--force` | Allow generation into a non-empty directory. |

By default the CLI clones `https://github.com/napplet/boilerplate.git`.

## Benchmarking production

From the napplet monorepo, run the production benchmark to measure the generator,
skills, and surrounding tooling against a concrete napplet scenario:

```bash
pnpm benchmark:creation -- --out benchmark.json --markdown benchmark.md
```

The report records development/tooling time, workflow evidence, scenario
accuracy, completeness, and a bug count based on failed checks.

The default command validates the methodology with a deterministic reference
implementation. Use `--candidate <path>` to score a real napplet produced after
using the skills, or `--no-reference --allow-failures` for an honest baseline
that may contain known gaps.

## See also

- [Getting started](/guide/getting-started) — scaffold and run your first napplet
- [`@napplet/vite-plugin`](./vite-plugin) — the manifest plugin the template wires up
