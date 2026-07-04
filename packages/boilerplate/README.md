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

## Benchmarking napplet production

The napplet monorepo includes a production benchmark for the generator, skills,
and surrounding tooling. It uses a concrete static prompt, then scores the
napplet an agent produced after one implementation attempt.

```bash
pnpm benchmark:creation
```

The default run scores `benchmarks/prompts/outbox-latest-note.md` against the
committed candidate fixture. Override the candidate and condition for real
one-shot agent outputs:

```bash
pnpm benchmark:creation -- \
  --prompt benchmarks/prompts/outbox-latest-note.md \
  --candidate /path/to/agent-output \
  --agent codex \
  --condition skills \
  --out benchmark.json \
  --markdown benchmark.md
```

Use the same prompt for every compared condition and change only the agent
context, such as `skills`, `no-skills`, or `docs-only`.
