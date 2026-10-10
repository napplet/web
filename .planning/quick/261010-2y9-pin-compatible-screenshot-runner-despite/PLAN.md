# Pin screenshot runner compatibility

The affected GB Color project contains conformance-cli 0.2.18. Unqualified npx selects that local dependency despite published 0.3.3 supporting screenshots and --artifact. Pin screenshot subprocesses to tested npm version 0.3.3, pin default conformance calls as well while preserving custom commands, and test the real package-resolution path from a project with the old dependency. Verify a real inline dry run without injecting a runner, update tests/docs and release metadata, run repository gates, and open a PR.
