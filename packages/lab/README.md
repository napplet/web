# @napplet/lab

Tooling for probing napplets and the shells that host them. Where `@napplet/conformance` asks "does this napplet speak NAP correctly?", the lab asks the opposite question: "does this shell actually hold the boundaries NIP-5D promises?" It is a private workspace package; nothing here is published to npm. Lab napplets are published as NIP-5D manifests with the `napplet` CLI from their own directories.

## Layout

| Path | What it is |
| --- | --- |
| `napplets/security-lab` | **Security Lab** (`@napplet/lab-security`): a napplet that runs a catalogue of sandbox, CSP, namespace, runtime and identity-revocation probes inside whatever shell loads it and reports each boundary as pass, fail, warning or info. Its `scripts/paja-check.mjs` drives the built artifact through Kehto Paja's runtime-pointer host headlessly, including the destructive revocation probes. |

More lab napplets will land beside it under `napplets/`; each is its own workspace package (`packages/lab/napplets/*` in `pnpm-workspace.yaml`) with its own `.napplet/config.yaml`.

## Working on a lab napplet

```bash
pnpm --filter @napplet/lab-security test:unit
pnpm --filter @napplet/lab-security build        # single-file dist/index.html + manifest template
pnpm --filter @napplet/lab-security test:paja    # headless Paja run of the built artifact
pnpm --filter @napplet/lab-security paja         # interactive Paja + Vite dev server
```

`pnpm --filter @napplet/lab test:paja` runs the Paja check for every lab napplet.

## Ground rules

- Probes trace to NIP-5D or a NAP clause and never invent surface. A probe reports what the spec says MUST hold (fail when violated), SHOULD hold (warning when not followed), or documents as a non-guarantee (info).
- Lab napplets are single-file artifacts, so their inlined JavaScript must never contain HTML-looking literals (`<meta`, `<head`, `<script`, ...). Shells and tooling splice their bootstrap into the artifact by string matching, and a literal in the wrong place cuts the napplet's code in half. Security Lab guards this with a source-level test.
- Anything that MUST end the session on a compliant shell (window-level messages after the handoff, self-navigation) is a destructive probe: never part of "run all", one explicit click each.
