# NAP-BLE implementation plan

## Source

- Canonical draft: `napplet/naps` PR #62 (`NAP-BLE`)
- Domain: `ble`
- Binding: `window.napplet.ble`, `shell.supports("ble")`

## Scope

- Add typed core and `@napplet/nap/ble` package surface.
- Add shim request/result correlation and `ble.event` subscriptions.
- Add SDK wrappers and global shim wiring.
- Add conformance envelope coverage and reference-shell canned responses.
- Update package/docs references and add release metadata.

## Verification

- Focused BLE shim tests.
- `pnpm build`
- `pnpm type-check`
- `pnpm -r test:unit`
- Served docs link check.
- `npx --yes aislop scan -d`
- `git diff --check`
- Public PR checks.
