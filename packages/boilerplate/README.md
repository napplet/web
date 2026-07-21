# @napplet/boilerplate

Interactive generator for the `github.com/napplet/boilerplate` template.

```bash
npx @napplet/boilerplate
```

The generator asks where to create the napplet, which package name to use, and
which NIP-5D napplet type to write into the Vite manifest config. It currently
ships one variant, `basic`; the CLI keeps a variant option so future templates
can be added without changing the command shape.

## Options

```bash
npx @napplet/boilerplate ./my-napplet --package-name my-napplet --napplet-type my-napplet
```

| Option | Purpose |
| --- | --- |
| `--variant <name>` | Template variant. Currently `basic`. |
| `--template <path-or-url>` | Override the template source. Useful for local verification. |
| `--package-name <name>` | `package.json` package name. |
| `--napplet-type <type>` | `nappletType` written to `vite.config.ts`. |
| `--title <title>` | App title written to `index.html` and README heading. |
| `--yes`, `-y` | Accept defaults and skip prompts. |
| `--force` | Allow generation into a non-empty directory. |

By default, the CLI clones:

`https://github.com/napplet/boilerplate.git`

## Agent guidance

The template intentionally does not vendor independent agent skill bodies.
Install the current `@napplet/skills` package in the generated project instead:

```bash
npx @napplet/skills install --to codex
```

Treat the [living NIP-5D proposal](https://github.com/nostr-protocol/nips/pull/2303),
[NAP-OUTBOX](https://github.com/napplet/naps/pull/32), and
[NAP-RELAY](https://github.com/napplet/naps/pull/2) as protocol authority for
the claims below. The shipped skills provide non-normative authoring guidance:
the runtime injects `window.napplet`, app calls use `@napplet/sdk`, direct
domain-property checks are only for optional fallbacks, normal Nostr reads and
publishes are OUTBOX-first, RELAY is an explicit relay-local escape hatch, and
manifest `requires` lists hard requirements only.
