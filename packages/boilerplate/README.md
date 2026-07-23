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

An archetype declaration pairs one role slug with one queryless convention, such
as `note:napplet:note/open`. When deployment metadata is later written, one
object represents one manifest tag and may carry optional same-tag event-kind
metadata:

```jsonc
{ "slug": "note", "convention": "napplet:note/open", "eventKinds": [1] }
// → ["archetype", "note", "napplet:note/open", "kind:1"]
```

The convention names a local payload choice; this generator does not define its
payload shape or infer event kinds. `napplet init` keeps its convention-only
input, while template manifest metadata preserves any optional trailing
`kind:<number>` fields unless deployment metadata replaces archetype tags.
For the living contract, see the adopted [NAP-INC #89
`4593ce9`](https://github.com/napplet/naps/blob/4593ce9e301ce098fd3dad64206fcd6f144fa7af/naps/NAP-INC.md),
[URI terminology #90 `896c32c`](https://github.com/napplet/naps/commit/896c32c92deee68dc4d10fc1132b62df20cccb6f),
and [NAP-INTENT #91
`a718915`](https://github.com/napplet/naps/blob/a718915ddefa2f03a0126579601f59d8bd86f7c4/naps/NAP-INTENT.md).

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
