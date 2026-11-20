---
quick_id: 261120-s8k
status: complete
branch: feat/conformance-strict-unknown-types
---

# Unknown message types are advisory; add strict mode

NIP-5D (nips#2303 @ f60550c3) §Wire Format: "Messages with an unrecognized `type` MUST be silently ignored. This allows forward compatibility as new NAPs are defined." Conformance hard-failed `unknown-domain` / `unknown-type` under `wire/envelope-well-formed` (rule-4 defect).

Split into advisory `wire/known-message-types`; malformed envelopes still fail. `RunOptions.strict` / `--strict` / `?strict=1` fail the run on any warning (maintainer's request: "gated behind a strict argument"). Groundwork for experimental-domain allowlisting (revived #187).
