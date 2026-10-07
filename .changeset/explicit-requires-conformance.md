---
"@napplet/conformance": patch
---

A `requires` tag naming a domain outside the known NAP list is now a warning (`manifest/requires-known`) instead of an error. `manifest/requires` still fails on anything that is not a bare lowercase domain (`[a-z][a-z0-9-]*`), such as `nap:relay`, `NAP-RELAY`, `relay.subscribe`, or `relay storage`.
