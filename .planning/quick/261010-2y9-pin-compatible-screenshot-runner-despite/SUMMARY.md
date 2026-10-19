# Compatible browser runner selection

The affected project had conformance-cli 0.2.18, then upgraded within its configured range to 0.2.19. Both predate screenshots. Versionless npx selected that local dependency instead of published 0.3.3, so --artifact reached the old conformance parser. Pin both screenshot and default conformance invocation to tested 0.3.3. Explicit custom conformance commands remain unchanged.

Regression coverage includes literal arguments on Windows and an opt-in real npm resolution test: an old local fixture reproduces the failure, then both maintained commands select the compatible published package. The integration test passed. A real inline deploy dry run from the GB Color project used the normal npm subprocess without a runner override, installed matching Chromium, captured the app, generated an image tag and cleaned up its temporary image. Reports are in /tmp/napplet-runner-proof. Nothing was uploaded or published. Node 22 was used for that full run; Node 26 also reached screenshot help with the versioned invocation.

Full build, type-check, unit suite and changed-code slop gate passed. CLI 0.8.7 is prepared, stacked on the pending source-metadata PR #237 (CLI 0.8.6) to keep releases ordered.
