# Quick Task 260703-ghg: Align napplet packages with NAP RelayEventResult sidecars and updated outbox stream lifecycle

**Date:** 2026-07-03
**Status:** Complete

## Plan

1. Verify live NAP-RELAY, NAP-RESOURCE, and NAP-OUTBOX PR text for `RelayEventResult` sidecars and outbox lifecycle.
2. Update relay/outbox/core/conformance types, shims, docs, and tests to use `RelayEventResult` and remove `outbox.eose`.
3. Run build, type-check, unit tests, static/slop checks, then commit and open a PR.
