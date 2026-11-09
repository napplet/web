---
phase: 261104-iwc-fix-blossom-upload-auth-fallback-masked-
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/cli/src/blossom-upload.ts
  - packages/cli/tests/deploy_network_test.ts
  - .changeset/blossom-gateway-auth-fallback.md
autonomous: true
requirements:
  - GH-269

estimate:
  tokens: 30000
  raw_tokens: 30000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "A deploy whose upload gets HTTP 502, 503 or 504 tries the next auth token, and succeeds when the server accepts the unscoped token"
    - "The first PUT to each server still carries a server tag holding the lowercase hostname, as BUD-11 specifies"
    - "When every attempt gets a gateway status, the server receives exactly 3 PUTs and the upload result reports that status"
    - "Any other 5xx response gets exactly 1 PUT, whatever its body says"
    - "After the fallback succeeds, later files to that server start with the working token and hit no further gateway error"
  artifacts:
    - path: "packages/cli/src/blossom-upload.ts"
      provides: "Auth attempt loop that continues past 502, 503 and 504"
      contains: "shouldTryNextAuthAttempt"
    - path: "packages/cli/tests/deploy_network_test.ts"
      provides: "Regression tests for gateway fallback, its limits and token carryover"
      contains: "gateway"
    - path: ".changeset/blossom-gateway-auth-fallback.md"
      provides: "Patch release note for @napplet/cli"
      contains: "@napplet/cli"
  key_links:
    - from: "uploadFileToServer in packages/cli/src/blossom-upload.ts"
      to: "shouldTryNextAuthAttempt in packages/cli/src/blossom-upload.ts"
      via: "The attempt loop returns the failure unless this predicate says to continue"
      pattern: "shouldTryNextAuthAttempt\\(result\\)"
    - from: "shouldTryNextAuthAttempt in packages/cli/src/blossom-upload.ts"
      to: "The failure text built by putFileToServer in packages/cli/src/blossom-upload.ts"
      via: "The status is parsed from the fixed prefix, so body text cannot change the decision"
      pattern: "returned HTTP"
---

<objective>
Make `napplet deploy` get past a gateway error that hides an auth rejection, so a large upload reaches the unscoped token instead of failing on the scoped one (napplet/web#269).

Purpose: a Blossom server that wrongly rejects a BUD-11 scoped token can stop reading a large body early. A CDN in front of it then returns 502 instead of the origin's 401, so today's auth-shaped check never runs the fallback that already works for small bodies.

Output: an updated retry predicate in `packages/cli/src/blossom-upload.ts`, regression tests in `packages/cli/tests/deploy_network_test.ts`, and a patch changeset for `@napplet/cli`.

Measured evidence (do not re-probe the network): against one server, a `server=<host>` token gets 401 "Server URL mismatch" on a 2 KB body and 502 on a 640 KB body. The same 640 KB body gets 200 with no `server` tag. Encoding, the `client` tag and `X-SHA-256` make no difference.

This is CLI transport behavior. It changes no NIP-5D or NAP surface.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@packages/cli/src/blossom-upload.ts
@packages/cli/tests/deploy_network_test.ts
@.changeset/reference-llm-invalid-request.md
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Carry one deploy past a gateway 502 to the unscoped token</name>
  <files>packages/cli/tests/deploy_network_test.ts, packages/cli/src/blossom-upload.ts</files>
  <behavior>
    - Test "executeNetworkDeploy retries without server scope when a gateway masks the auth failure": the first PUT returns 502 with an HTML body and the second returns 201 with a matching descriptor. `result.uploaded[0].success` is true, there are 2 PUTs, the first token's `server` tag is `blob.example`, and the second token has no `server` tag.
  </behavior>
  <action>
RED: add the test named in the behavior block directly after the existing test "executeNetworkDeploy retries without server scope on server URL mismatch", copying its structure (`withTempDir`, `manifestsFor`, `createFakeFetch`, `fakePublish`, an `attempts` counter). On attempt 1, return a `Response` with status 502 and the body `<html>Bad Gateway</html>`. Run the test command and confirm this test fails because only 1 PUT happens.

GREEN: make these changes in `packages/cli/src/blossom-upload.ts`.

1. Rename `isRetryableAuthFailure` to `shouldTryNextAuthAttempt` at its definition and at its one call site in `uploadFileToServer`, because it now also covers failures with no auth-shaped text.
2. In that function, after the existing `result.success` check, read the status from the fixed prefix `putFileToServer` writes, using the regular expression `^PUT \S+ returned HTTP (\d{3})\b` converted with `Number`. The `x-reason` value and body text come after this prefix, so a body that mentions another status cannot change the decision.
3. Return true when the status is 502, 503 or 504, whatever the body says.
4. Return false for every other status except 400 and 401. This includes a non-match, such as a blob descriptor failure, where `Number` yields `NaN`.
5. For 400 and 401, keep the existing auth-shaped regular expression unchanged, still tested against the full error text.
6. Above the gateway check, add this comment: "A CDN or gateway can report 502/503/504 when the origin rejects a large upload before reading the whole body, which hides the auth failure, so these statuses move on to the next token."
7. Replace the last sentence of the comment at the top of the server loop in `uploadFilesToServers` with: "Some deployed Blossom servers reject either scoped tokens or base64url auth, so retries below fall back only after an auth-shaped failure or a gateway status that can hide one."

Leave these unchanged: the order of `authAttempts`, the `once` signing wrappers, `preferredAuthAttempt` and `orderedAuthAttempts`, and `createUploadAuthorization`. Keep sending `serverHost(server)` as the first token's `server` tag: BUD-11 requires a lowercase domain, so the token is conformant and the server is at fault. Do not switch it to a full URL, even though the measured server accepts one.

Do not retry any other 5xx status. Do not run `deno fmt` on these existing files, because the CLI sources are not fmt-clean and it would add unrelated churn.

Commit the source and test files by explicit path as `fix(cli): try the next Blossom auth token after a gateway error`.
  </action>
  <verify>
    <automated>cd packages/cli && deno test --allow-read --allow-write --allow-run --allow-env tests/deploy_network_test.ts && grep -q 'shouldTryNextAuthAttempt(result)' src/blossom-upload.ts && grep -A4 'BUD-11: scope each token' src/blossom-upload.ts | grep -q 'gateway'</automated>
  </verify>
  <done>The new test failed before the source change and passes after it. Every existing test in the file still passes, including the two earlier auth fallback tests and "createUploadAuthorization signs a base64url upload token scoped to the server".</done>
</task>

<task type="auto">
  <name>Task 2: Pin the limits of the fallback and the token carryover</name>
  <files>packages/cli/tests/deploy_network_test.ts</files>
  <action>
Add these three groups of tests after the test from Task 1. All use `executeNetworkDeploy` through `createFakeFetch`, and none touch the network.

1. Persistent gateway errors. Loop over `[502, 503, 504]` at module level and register one `Deno.test` per status, named "executeNetworkDeploy tries every auth attempt on a persistent gateway ${status}". Every PUT returns that status with the body `bad gateway`. Assert:
   - there are exactly 3 PUTs
   - `result.uploaded[0].success` is false
   - `result.uploaded[0].error` includes `HTTP ${status}`
   - `result.published.length` and the published `events.length` are both 0
   - the attempt order is intact: PUT 1 has the `server` tag, PUT 2 decoded with `decodeAuthEvent` has none, and PUT 3 decoded with `decodeStandardAuthEvent` has none

2. Other 5xx statuses. Add one test named "executeNetworkDeploy does not retry other 5xx responses, whatever their body says". Inside it, loop over these status and body pairs, with a fresh `calls` array and fake publisher for each:
   - 500 with `nope`
   - 500 with `upstream returned HTTP 502`
   - 500 with `upstream returned HTTP 401: invalid authorization`
   - 501 with `nope`
   - 505 with `nope`

   For each pair, assert exactly 1 PUT, `success` false, and an error that includes `HTTP ${status}`. The two pairs with a status in the body prove the decision reads the response status, not the body text. The 401 pair would have been retried before Task 1.

3. Multi-file carryover. Add one test named "executeNetworkDeploy sends later files straight to the token that got past the gateway".
   - Write `index.html` and `app.js` in the temp dir and build manifests with `manifestsFor(dir, [{ path: "/index.html", sha256 }, { path: "/app.js", sha256: secondSha256 }])`.
   - `createFakeFetch` passes only the URL to `putResponse` but records the call first, so read the current request from `calls[calls.length - 1]` inside the closure. Leave the helper unchanged.
   - If that call's token has a `server` tag, return 502. Otherwise return 201 with a descriptor whose `sha256` is that call's `xSha256`, because the descriptor check compares it against each file's own hash.
   - Assert that `puts.map((call) => call.xSha256)` equals `[sha256, sha256, secondSha256]`.
   - Assert that the `server` tag is present only on the first PUT, that both upload results succeed, and that `networkDeploySucceeded(result, manifests)` is true.

Do not change the production code in this task. If a test fails, the Task 1 predicate is wrong, so fix the predicate rather than loosening the assertion.

Commit the test file by explicit path as `test(cli): cover Blossom gateway fallback limits and token carryover`.
  </action>
  <verify>
    <automated>cd packages/cli && deno test --allow-read --allow-write --allow-run --allow-env tests/deploy_network_test.ts && grep -c 'Deno.test' tests/deploy_network_test.ts</automated>
  </verify>
  <done>The test file passes with the new tests in it. A 502, 503 or 504 on every attempt produces exactly 3 PUTs and reports that status. Each listed 5xx pair produces 1 PUT. The two-file deploy makes 3 PUTs in total, with only one gateway error.</done>
</task>

<task type="auto">
  <name>Task 3: Add the changeset and run the CLI gates</name>
  <files>.changeset/blossom-gateway-auth-fallback.md</files>
  <action>
Create `.changeset/blossom-gateway-auth-fallback.md`, following the format of `.changeset/reference-llm-invalid-request.md`. The frontmatter names only `"@napplet/cli": patch`. The body is one physical line, not hard-wrapped, and reads: "`napplet deploy` now moves on to the next Blossom auth token when an upload gets HTTP 502, 503 or 504. A CDN in front of a server can turn an early auth rejection into one of these statuses on larger uploads, which used to fail the deploy before the unscoped token was tried. Other 5xx responses still fail without a retry."

Docs: no change is expected. During planning, `packages/cli/README.md`, `apps/docs` and `skills` had no text describing the upload auth fallback. Repeat the check by searching those paths for `isRetry`, `auth-shaped` and `unscoped`, and update any hit that has appeared since.

Commit the changeset by explicit path as `chore(cli): add changeset for Blossom gateway fallback`. Leave the unrelated untracked paths out of every commit: `.codebase-memory/`, `.planning/research/.cache/`, `packages/cli/dist-bin/` and `workshop/`.
  </action>
  <verify>
    <automated>[ "$(grep -c . .changeset/blossom-gateway-auth-fallback.md)" -eq 4 ] && grep -q '"@napplet/cli": patch' .changeset/blossom-gateway-auth-fallback.md && cd packages/cli && deno task check && deno test --allow-read --allow-write --allow-run --allow-env tests/deploy_network_test.ts</automated>
  </verify>
  <done>The changeset exists with a single-line body and names only `@napplet/cli`. The CLI type check and the deploy network tests both pass.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| CLI to Blossom server or its CDN | The HTTP status and body are untrusted input and now decide whether another signed token is sent |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-261104-iwc-01 | Tampering | `shouldTryNextAuthAttempt` | medium | mitigate | Read the status from the fixed `PUT <url> returned HTTP <status>` prefix, so server-controlled body text or `x-reason` cannot trigger or suppress a retry. The "whatever their body says" test in Task 2 proves it. |
| T-261104-iwc-02 | Information Disclosure | Unscoped token sent after a gateway status | low | accept | A gateway can now cause the unscoped token to be sent, and it could be replayed at another server. The existing 401 fallback already allows this. The token only authorizes uploading the listed blob hashes and expires within an hour, and these blobs are public and content-addressed. |
| T-261104-iwc-03 | Denial of Service | Repeated PUTs during a real outage | low | accept | A persistent 502, 503 or 504 costs up to 3 full-body PUTs per file per server, because the preferred attempt only moves on success. Attempts are capped at 3, and signing stays capped at 3 per server through `once`. Task 2 asserts the PUT cap. |
</threat_model>

<verification>
Run before shipping, per the repo's definition of done:

- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- `npx -y aislop@0.12.0 scan .` (the known baseline is 98/100, with the `deepmerge` advisory as the only warning)

No verification step in this plan calls a live Blossom server. The PR body should say so, and should reference napplet/web#269 and list the measured results from the objective.

Source audit:

| Source | Item | Task | Status |
|--------|------|------|--------|
| GOAL | Deploy gets past a gateway error that hides an auth rejection | 1 | COVERED |
| REQ | GH-269: the standalone CLI uploads the 640 KB artifact | 1, 2 | COVERED by fake-fetch tests; the live path is not re-run |
| RESEARCH | The first token stays a conformant lowercase domain | 1 | COVERED |
| CONTEXT | 502, 503 and 504 retry regardless of body text | 1, 2 | COVERED |
| CONTEXT | Other 5xx statuses do not retry | 1, 2 | COVERED |
| CONTEXT | Attempt order, `once` signing and preferred-attempt carryover are kept | 1, 2 | COVERED |
| CONTEXT | Comment at the top of `uploadFilesToServers` is accurate | 1 | COVERED |
| CONTEXT | Tests 1 to 4 from the decided fix | 1, 2 | COVERED |
| CONTEXT | Patch changeset for `@napplet/cli` | 3 | COVERED |
</verification>

<success_criteria>
- `deno test --allow-read --allow-write --allow-run --allow-env tests/deploy_network_test.ts` passes from `packages/cli`, with the new tests included.
- The first PUT to a server still carries `server=<lowercase host>`.
- A gateway status moves to the next token, and no other 5xx status does.
- `.changeset/blossom-gateway-auth-fallback.md` is committed as a patch for `@napplet/cli`.
</success_criteria>

<output>
Create `.planning/quick/261104-iwc-fix-blossom-upload-auth-fallback-masked-/261104-iwc-SUMMARY.md` when done.
</output>
