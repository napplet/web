# NAP-SYSTEM implementation plan

## Source

- Canonical draft: `napplet/naps` PR #64 (`NAP-SYSTEM`)
- Domain: `system`
- Binding: `window.napplet.system`, `shell.supports("system")`

## Scope

- Add typed core and `@napplet/nap/system` package surface.
- Add shim request/result correlation for the read-only system accessors.
- Add SDK wrappers and global shim wiring.
- Add conformance envelope coverage and reference-shell canned responses.
- Update package/docs references and add release metadata.

## Verification

- Focused system shim tests.
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- Served docs link check.
- `npx --yes aislop scan -d`
- `git diff --check`
- Public PR checks.
