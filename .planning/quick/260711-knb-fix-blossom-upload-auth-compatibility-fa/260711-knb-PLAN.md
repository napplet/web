# Quick Task 260711-knb: Fix Blossom Upload Auth Compatibility

## Goal

Make CLI network deploy uploads succeed against Blossom servers that reject either scoped
`server` tags or BUD-11 base64url auth headers, while keeping the spec-first upload token
as the first attempt.

## Tasks

1. Move upload-specific code into `packages/cli/src/blossom-upload.ts` and add
   narrow auth retry variants there.
   - First attempt remains scoped, base64url, BUD-11-shaped auth.
   - Retry with unscoped base64url for servers that reject optional `server` scope.
   - Retry with unscoped standard base64 for legacy servers that only decode standard base64.

2. Add focused regressions in `packages/cli/tests/deploy_network_test.ts`.
   - Cover `Server URL mismatch` recovery.
   - Cover `Invalid auth string` recovery.
   - Preserve existing per-server scoped token test for first-attempt behavior.

3. Verify with focused CLI tests, repo gates, and a live upload probe against the
   reported Blossom servers.
