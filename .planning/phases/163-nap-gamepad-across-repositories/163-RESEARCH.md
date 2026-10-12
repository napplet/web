# Research

Non-normative; defer to the linked living specifications in CONTEXT.md.

The active web monorepo separates protocol/global types in core, per-domain types/shim/helpers in nap, selected runtime injection in shim, and late-bound application wrappers in sdk. npm/JSR export maps and tsup entrypoints require explicit new subpaths. Existing core dispatch registration is private package plumbing; do not add wire handshakes.

Conformance has JSON envelope validators, endpoint-bound reference responses, a browser boot harness and separate CLI/Paja transport. Add state/subscription coverage and controller denial to the existing boundaries. The browser harness presently creates allow-scripts frames without controller policy denial. Kehto owns production runtime/Paja device and focus mediation and therefore needs corresponding integration.

Organization inventory: web, naps, boilerplate, .github, cvm, nappagochi, migrate. naps contains published GAMEPAD proposal #108; .github is community metadata. Audit other repos against their current default branches, not dirty existing local worktrees. Boilerplate documentation contains obsolete NIP-5A aggregate-hash guidance; correct it against current NIP-5D while adding controller authoring guidance.

Verification will use canonical connected/neutral/blocked examples, multi-session focus transitions and native Permissions-Policy denial in Chromium. Test public import surfaces in built npm packages and JSR source maps. Do not require controllers on machines that lack them or declare gamepad as a hard capability for apps retaining other input.
