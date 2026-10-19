# CLI terminal proof

These are recordings of the compiled macOS ARM64 CLI, rendered from actual PTY output with xterm and captured by Playwright. The terminal framing is presentation only; prompt text, colors, progress, and results come from the executable. Source revision and binary checksum are in [capture-metadata.json](capture-metadata.json).

The deployment uses two loopback Blossom HTTP fixtures and one WebSocket relay fixture. Both servers receive the real single-file HTML bytes and report matching hashes. The CLI signs one current-format manifest with a fresh ephemeral key entered through hidden input. No public service receives a deployment. The fixtures exercise transport and display; they do not model production authentication or relay policies.

## Screenshots

| Scenario | Proof |
|---|---|
| ASCII banner and grouped help | [Help](png/01-help.png) |
| Missing settings, save choice, and deployment preflight | [Guided setup](png/02-guided-setup.png) |
| Actual 50% upload progress with separate mirror rows | [Upload progress](png/03-upload-progress.png) |
| Completed uploads, relay acknowledgement, and copyable references | [Deployment result](png/04-deployment-result.png) |
| `-i` in a real terminal exits with guidance and no prompt | [Non-interactive](png/05-non-interactive.png) |
| `NO_COLOR=1` emits no ANSI escape sequences | [Plain output](png/06-no-color.png) |

The `.ansi` files retain terminal bytes, and `.cast` files can be replayed with asciinema. [verification.json](verification.json) records assertions for CI, JSON, cancellation, preserved settings, and hidden input. [network-evidence.json](network-evidence.json) records received hashes and event IDs. [machine-output.json](machine-output.json) is the JSON dry-run output.

## Reproduce

Run from the repository root on Unix with Python 3, Deno, Node 22, workspace dependencies, and Playwright Chromium installed. Substitute the native compile target and binary name on another platform.

```sh
deno task --cwd packages/cli compile:darwin-aarch64
python3 scripts/cli-proof/capture.py --binary packages/cli/dist/napplet-darwin-aarch64 --output /tmp/napplet-cli-proof
npm install --prefix /tmp/napplet-cli-proof-render --no-audit --no-fund @xterm/xterm@6.0.0
node scripts/cli-proof/render.mjs /tmp/napplet-cli-proof /tmp/napplet-cli-proof/png /tmp/napplet-cli-proof-render/node_modules/@xterm/xterm
```

The capture creates and removes a temporary project, starts and stops local network fixtures, and never modifies your project configuration or saved keys. Ports, event timestamps, public keys, and elapsed times vary between runs.
