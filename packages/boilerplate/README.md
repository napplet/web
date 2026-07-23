# @napplet/boilerplate

Project scaffold generator behind `napplet create`. It clones the maintained
`github.com/napplet/boilerplate` Vite + TypeScript template and derives the
`package.json` name from the destination directory.

```bash
napplet create my-napplet
```

Deployment name, title, description, and archetype roles plus conventions belong to
`napplet init`; this generator does not prompt for or mutate them. It currently
ships one variant, `basic`.

An archetype declaration pairs one role slug with one opaque convention, such as
`note:napplet:note/open`. The convention names a local payload choice; its payload
shape is not defined by this generator.

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

## Agent guidance

The template intentionally does not vendor independent agent skill bodies.
Initialize deployment metadata, then install the current skills in the project:

```bash
napplet init
napplet skills install --to codex
```

Treat the [living NIP-5D proposal](https://github.com/nostr-protocol/nips/pull/2303),
[NAP-OUTBOX](https://github.com/napplet/naps/pull/32), and
[NAP-RELAY](https://github.com/napplet/naps/pull/2) as protocol authority for
the claims below. The shipped skills provide non-normative authoring guidance:
the runtime injects `window.napplet`, app calls use `@napplet/sdk`, direct
domain-property checks are only for optional fallbacks, normal Nostr reads and
publishes are OUTBOX-first, RELAY is an explicit relay-local escape hatch, and
manifest `requires` lists hard requirements only.
