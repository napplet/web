# Deferred findings

These findings predate this integration's repairs and are not reasons to weaken the unchanged CI configuration.

## Blocking scope decision

Current NAP-RESOURCE PR #80 head `2529209a1a031e1411f84823c6d5fe8c594f78d7` specifies `urls` bulk requests and canonical base64 wire `blob` fields, converted to Blobs in the web binding. Both original feature and fetched main still define `requests: ResourceBytesRequest[]` and `blob: Blob` in `packages/nap/src/resource/types.ts:120,166`, and the existing shim forwards those shapes. The optimizer's preserved bulk seam and fake-Blob fixtures do not prove interoperability with the living proposal. This is flagged under AGENTS.md, not silently propagated as normative truth. A breaking SDK/NAP/conformance migration needs an explicit scope decision outside this quick merge; task status remains incomplete.

## Non-blocking gate findings

- `packages/boilerplate/package.json`: main pins `fflate` 0.8.2, affected by moderate GHSA-px8p-9vwx-vf98 (malformed ZIP64 denial of service). `pnpm audit --json` exits 1 with one moderate advisory and no high/critical advisories. `packages/cli/deno.json` also imports that version. A separate dependency/security task should verify and update the upstream package; this task does not substitute or install a different dependency.
- `packages/cli/src/output.ts:69`: existing `renderDeployReport` is 89 lines; unchanged by the integration repair.
- `packages/vite-plugin/src/optimizer/references.ts`: existing file is 472 lines; unchanged by the integration repair.
- `packages/vite-plugin/src/manifest.ts`: combined optimizer/current-schema integration is 445 lines. The final post-commit full scan reports this additional file-size warning. Refactoring solely to satisfy a maintainability target is deferred; no runtime correctness gate fails and no rule was weakened.

The actual `sandwichfarm/aislop-badge@v1` workflow command, pinned to `aislop@0.12.0`, passed at 96/100 in pre-commit scans and **95/100 in the final post-commit full scan**, with its unchanged `minimum-score: 70` and `fail-on-error: false`. The aspirational 100/100 score is not claimed. All four findings were added to `.planning/WINDOWS.md` without erasing older entries.

The ordinary CLI unit suite's two opt-in integration tests are separately exercised with `NAPPLET_TEST_STANDALONE=1` and `NAPPLET_TEST_NPM_RUNNER=1`. Tutorial conformance reports six checks as not measurable in that harness; the separate five-test conformance e2e suite passes. No new skips, stubs or protocol requirements were introduced.
