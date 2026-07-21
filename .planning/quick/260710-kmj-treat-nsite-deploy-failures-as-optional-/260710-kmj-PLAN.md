---
quick_id: 260710-kmj
status: ready
description: Treat nsite deploy failures as optional skips in Deploy site
---

# Quick Task 260710-kmj Plan

## Goal

Keep the `Deploy site` workflow successful when the optional nsite mirror publish fails,
while preserving hard failures for build, assembly, Bunny storage configuration, and Bunny
CDN deploy.

## Tasks

1. Update `.github/workflows/deploy-site.yml`
   - Add a stable step id to the nsite deploy step.
   - Set step-level `continue-on-error: true` only on the nsite deploy step.
   - Add a follow-up warning step keyed on the raw nsite step outcome so failed nsite
     publishes are visible as skipped optional mirror failures.

2. Verify workflow syntax and scope
   - Parse the workflow YAML.
   - Check the resulting diff keeps every upstream build/Bunny step blocking.
   - Confirm the live failure mode was the nsite signer timeout, not a build failure.
