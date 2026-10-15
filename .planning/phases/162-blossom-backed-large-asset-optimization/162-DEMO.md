# Phase 162 final demonstration evidence

The generated Vite fixture proves the optimization path without committing binary fixture assets. It generates seven 6–9 MiB assets (57,671,680 candidate bytes), measures a 76,896,853-byte would-be inline HTML artifact, selects assets in deterministic descending byte order, and produces an 8,366-byte final `index.html`.

`pnpm --filter @napplet/vite-plugin test:unit -- optimizer/large-fixture.test.ts` executes the real Vite build through the public plugin configuration. It verifies signed kind-10002 discovery through the write/unmarked relay set, kind-10063 server selection, kind-24242 upload authorization, exact descriptor hashes/sizes, conditional `['requires', 'resource']`, aggregate `deca44de168d770648d7049d86ca5dfb45f7bc1420bd019815e1184ae3a5436f`, final index SHA-256 `cc6719e89c46acee49dc0a67d44e35286f2943db3103490dda719ade560db716`, and byte-identical recovery for all seven resources.

The selected order is fixture-01 through fixture-07: 9 MiB, 9 MiB, 8 MiB, 8 MiB, 8 MiB, 7 MiB, then 6 MiB. The primary and secondary normalized test origins are `https://primary.blossom.fixture.test` and `https://secondary.blossom.fixture.test`; the fixture confirms the secondary failure is noncommittable and corrupt resource data is rejected. It also proves the intentional limit: each selected resource is at most 10 MiB and a larger whole Blob remains inline. This implementation does not claim streaming, ranges, progress, universal browser interception, or a portable single-Blob 50 MiB recovery path.

Runtime/tool versions: Node v26.7.0, pnpm 10.8.0, and Deno 2.9.5. Final commands: scanner unit plus outward scan; Deno build-tools/CLI checks; `pnpm build`; `pnpm type-check`; `pnpm -r test:unit`; `pnpm check:links`; `pnpm check:jsr`; `pnpm test:release-tooling`; `npx --yes aislop@0.12.0 scan --changes --base origin/main`; and `git diff --check`. The 162-11 scanner additionally checked generated/report/evidence paths and the staged evidence diff without emitting matched values.

Protocol boundary: NIP-5D and NIP-5A retain authority over sandboxing, manifest, aggregate, and capability negotiation. The loader and its resource mapping are non-normative private bytes in signed `index.html`, while the emitted `requires: resource` declaration and `window.napplet.resource` calls are protocol dependencies defined by the published open NAP-RESOURCE proposal at <https://github.com/napplet/naps/pull/80>. Build-time SSRF and redirect checks are local hardening, not new protocol obligations.

The Deno workspace validation uses `deno check --config packages/cli/deno.json packages/build-tools/src/index.ts`; it deliberately avoids regenerating the user-owned root `deno.lock`. The unrelated modified root `package.json`, root `deno.lock`, `.planning/config.json`, caches, generated CLI binaries, and workshop directory remain unstaged and are not part of the release commit or PR.

PR: https://github.com/napplet/web/pull/205
