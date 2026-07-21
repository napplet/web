# @napplet/cli

> CLI-first onboarding for napplet developers.

## Install

```bash
pnpm add -g @napplet/cli
# or download a standalone binary from the Build CLI Binaries workflow artifacts
```

## Start A Napplet

```bash
napplet init my-napplet
cd my-napplet
pnpm install
napplet doctor
napplet skills install
```

`napplet init` creates a minimal Vite app and `.napplet/napplet.json`. The config file owns the napplet's package name, display title, NIP-5A type, shell security class, direct-connect origins, build command, and deployment command.

For an existing Vite app:

```bash
napplet configure --title "My Napplet" --type my-napplet
napplet doctor
```

`napplet configure` writes `.napplet/napplet.json` without replacing app source. `napplet doctor` then checks whether package dependencies, Vite plugin wiring, shim import usage, and deployment settings match the supported flow.

## Commands

| Command | Purpose |
|---------|---------|
| `napplet init [directory]` | Create the starter app and `.napplet/napplet.json` |
| `napplet configure` | Create `.napplet/napplet.json` for an existing app |
| `napplet doctor` | Check whether the project follows the CLI-owned onboarding path |
| `napplet skills install` | Install the `build-napplet` agent skill into `.codex/skills` |
| `napplet build` | Run the configured `build.command` |
| `napplet deploy` | Build, then run the configured `deploy.command` |

## Configure Deployment

Set a provider command in `.napplet/napplet.json`:

```json
{
  "deploy": {
    "provider": "nsyte",
    "command": "nsyte deploy dist --relays wss://relay.example.com",
    "relays": ["wss://relay.example.com"]
  }
}
```

Then run:

```bash
napplet deploy
```

The CLI intentionally fails after a successful build if no deploy command is configured, so developers do not mistake a local build for a published napplet.
