---
quick_id: 261014-fuc
type: quick
---

# Replace blossom:sha256 URIs with BUD-10 form

1. Replace every `blossom:sha256:<hex>` occurrence (packages, docs, specs, skills, tests, archived planning) with the BUD-10 `blossom:<sha256>.<ext>` form (`.bin` when the extension is unknown).
2. Link BUD-10 (https://github.com/hzrd149/blossom/blob/master/buds/10.md) from scheme descriptions and add `@see` tags to resource JSDoc.
3. Verify with type-check, unit tests, build; flag that canonical NAP-RESOURCE (napplet/naps#80) still names `blossom:sha256:<hex>`.
