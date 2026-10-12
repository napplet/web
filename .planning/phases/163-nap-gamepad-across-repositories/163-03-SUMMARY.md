---
phase: 163
plan: 03
status: complete
---

# All repositories and shipment

All seven organization repositories plus Kehto are audited. Applicable source, consumer/toolchain, template, migration, policy, organization, site/package/skill, and release surfaces are covered in COVERAGE.md. Primary build/type/unit/docs/slop gates pass. CVM controller suites pass; protected-authority and timing failures also reproduce on its untouched baseline. Linked PRs and final host gates are recorded before completion.

Non-normative evidence; protocol authority remains the living references in 163-CONTEXT.md.

Opened PRs: web #242, Kehto #297, boilerplate #7, Nappagochi #1, migrate #1, CVM #1, organization #1. naps proposal #108 remains the canonical open draft. Publish Kehto CLI 0.5.5/Paja 0.21.0 before the primary release. All owned working trees are clean; unrelated original work remains unchanged.

Release sequencing correction: primary web #242 publishes the SDK/conformance set while retaining the already-published CLI runners. Draft follow-up [#243](https://github.com/napplet/web/pull/243) changes the private runner pins and CLI version only after conformance CLI 0.3.4 and Kehto CLI 0.5.5/Paja 0.21.0 publish. Fresh-cache CI correctly rejected nonexistent future versions, which prompted this split; no provisioning test was weakened.
