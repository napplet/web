# @napplet/boilerplate

Project scaffold generator behind `napplet create`. It clones the maintained `github.com/napplet/boilerplate` Vite + TypeScript template and derives the `package.json` name from the destination directory.

```bash
napplet create my-napplet
```

Deployment name, title, description, and archetype roles plus conventions belong to `napplet init`; this generator does not prompt for or mutate them. It currently ships one variant, `basic`.

An archetype declaration pairs one role slug with one queryless convention, such as `note:napplet:note/open`. When deployment metadata is later written, one object represents one manifest tag:

```jsonc
{ "slug": "note", "convention": "napplet:note/open" }
// → ["archetype", "note", "napplet:note/open"]
```

The convention names a local payload choice; this generator does not define its payload shape. For the living contract, see [the archetype registry](https://github.com/napplet/naps/blob/master/ARCHETYPES.md) and [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md).

## Options

```bash
napplet create my-napplet
```

| Option | Purpose |
| --- | --- |
| `--variant <name>` | Template variant. Currently `basic`. |
| `--template <path-or-url>` | Override the template source. Useful for local verification. |
| `--yes`, `-y` | Use `./my-napplet` when the destination is omitted. |
| `--force` | Allow generation into a non-empty directory. |

By default, the CLI clones:

`https://github.com/napplet/boilerplate.git`

## Programmatic CLI API

`runCli(argv)` runs the same generator command contract without terminating its importer. It resolves to `0` on success and `1` after writing the maintained `@napplet/boilerplate:` diagnostic.

```ts
import { runCli } from '@napplet/boilerplate';

const status = await runCli(['my-napplet', '--template', './template']);
```

## Agent guidance

The template intentionally does not vendor independent agent skill bodies. Initialize deployment metadata, then install the current `napplet-*` skills with the skills.sh CLI:

```bash
napplet init
npx skills add napplet/napplet
```

Treat the [living NIP-5D proposal](https://github.com/nostr-protocol/nips/pull/2303), [NAP-OUTBOX](https://github.com/napplet/naps/pull/32), and [NAP-RELAY](https://github.com/napplet/naps/pull/2) as protocol authority for the claims below. The shipped skills provide non-normative authoring guidance: the runtime injects `window.napplet`, app calls use `@napplet/sdk`, direct domain-property checks are only for optional fallbacks, normal Nostr reads and publishes are OUTBOX-first, RELAY is an explicit relay-local escape hatch, and manifest `requires` lists hard requirements only.
