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

