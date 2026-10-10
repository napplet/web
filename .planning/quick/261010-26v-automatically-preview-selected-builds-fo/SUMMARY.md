# Automatic screenshot previews

Implemented bare `deploy --screenshot` using the exact selected build artifacts. Distinct builds get distinct images; companion snapshots share a capture. The browser runner starts disposable loopback asset and Kehto Paja servers, retains explicit URL capture, and installs Chromium when absent. Paja uses its normal development runtime with live relays; disabling relay made the real GB Color app fail its required-domain check, so the preview retains Paja defaults. Published Paja 0.19.0 uses its compatible 0.32.0 core/nap peers, separately from workspace 0.33.0.

Verification: full build, type-check and unit suite passed (177 CLI tests; 22 browser runner tests). Real standalone and inline deploy dry-run captures of the existing GB Color build show the Rayman title screen. Proof PNGs, input hash, reproduction script and dry-run report are in `/tmp/napplet-screenshot-proof`. No deployment publication was performed. Server tests cover asset boundaries, symlink rejection and closure; CLI tests cover URL and automatic success/failure cleanup and multi-build deduplication.

Prepared CLI 0.8.5 and conformance-cli 0.3.3 via changesets and synchronized docs. Changed-code AI-slop scan passed with no findings.
