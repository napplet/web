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

## Deployment metadata boundary

The generated project leaves archetype metadata to `napplet init`. Each
manifest archetype tag advertises one complete queryless
`napplet:<archetype>/<intent>` identity:

```json
["archetype", "profile", "napplet:profile/open"]
```

Object-form CLI or Vite configuration may add `eventKinds: [0, 3]`, producing
same-tag `kind:0` and `kind:3` discovery fields. The flag and wizard remain
convention-only, and neither the generator nor runtime infers an event kind
from payload content.

URI queries are per-invocation payload sugar only at INC `emit` and intent
`invoke/open`. They never appear in manifest discovery, subscriptions, or
normalized identities. Intent acceptance is separate from later target
`onDelivery`; sender is runtime-attested, delivery has no public identifier,
and NAP-INTENT has no public NAP-INC dependency.

This guidance follows the exact draft heads of [NAP-INC PR #89
(`4593ce9`)](https://github.com/napplet/naps/pull/89/commits/4593ce9e301ce098fd3dad64206fcd6f144fa7af),
[the governance/web projection PR #90
(`896c32c`)](https://github.com/napplet/naps/pull/90/commits/896c32c92deee68dc4d10fc1132b62df20cccb6f),
and [NAP-INTENT PR #91
(`a718915`)](https://github.com/napplet/naps/pull/91/commits/a718915ddefa2f03a0126579601f59d8bd86f7c4).

## See also

- [Getting started](/guide/getting-started) — scaffold and run your first napplet
- [`@napplet/vite-plugin`](./vite-plugin) — the manifest plugin the template wires up
