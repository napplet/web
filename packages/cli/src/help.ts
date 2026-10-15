/** Compact help for human workflows, with detailed flags scoped to each command. */
export const HELP = `Build a napplet. Preview it. Publish when ready.

Usage: napplet <command> [options]

Create and develop
------------------
  create [directory]    Start from the napplet boilerplate
  init                  Complete missing project settings
  guide                 Read the developer workflow
  discover              Find built napplets (JSON)
  paja                  Open the local development shell

Verify and publish
------------------
  conformance           Check your built napplet
  screenshot [target]   Capture a preview image
  deploy                Prepare, sign, upload, and publish
  debug                 Inspect the deployment plan (JSON)
  migrate <event.json>  Preview a legacy event migration (JSON)

Signing keys
------------
  keys store            Save a signing key or bunker session
  keys connect          Pair with a remote signer
  keys use              Select a stored key for this project
  keys list             List stored references
  keys delete           Remove a stored reference
  keys doctor           Check local key storage

Terminal options
----------------
  -i, --non-interactive  Disable prompts; use flags or config
  --no-color            Plain output (also honors NO_COLOR)
  --help, -h            Show command help
  --version, -v         Show installed version

  CI and redirected streams disable prompts automatically.
  Deploy --json keeps stdout machine-readable, without a banner.

Get started
-----------
  napplet create my-napplet
  napplet init
  napplet deploy --dry-run

Run napplet <command> --help for options and examples.
`;

const details: Record<string, string> = {
  create: `Usage: napplet create [directory] [options]

  --template <path-or-url>  Choose a local or hosted starter
  --force                   Allow a non-empty destination
  -i, --non-interactive      Use defaults without prompts

Example: napplet create my-napplet -i`,
  init: `Usage: napplet init [options]

  --config <file>         Use a specific configuration file
  --source-dir <dir>      Directory containing a build or dist/
  --name <name>           Named publishing target (repeatable)
  --root                  Use the root publishing target
  --title <text>          Display title
  --description <text>    Description for manifest publication
  --archetype <URI>       Convention such as napplet:note/open
  --relay <url>           Publishing relay (repeatable)
  --server <origin>       Blossom server (repeatable)
  --force                 Replace existing configuration

Existing settings are preserved unless --force is supplied.
Missing values are requested in an interactive terminal.`,
  deploy: `Usage: napplet deploy [options]

  --dry-run              Preview; do not upload or publish
  --json                 Output a machine-readable deployment report
  --config <file>        Use a specific configuration file
  --source-dir <dir>     Override the build directory
  --description <text>   Override the manifest description
  --relay <url>          Override publishing relays (repeatable)
  --server <origin>      Override Blossom servers (repeatable)
  --name <name>          Select a named target (repeatable)
  --root                 Publish the root target
  --snapshot             Also create an immutable snapshot
  --all                  Discover builds recursively
  --format current|legacy  Event format (default: current)
  --sec <secret>         Use a signing key or bunker session
  --prompt-sec           Read a hidden secret, or explicit piped input
  --zapstore             Publish application metadata
  --no-zapstore          Skip application metadata
  --screenshot [url]     Capture an application preview

Capture controls: --screenshot-selector, --screenshot-ready-selector,
  --screenshot-width, --screenshot-height, --screenshot-delay.

Examples:
  napplet deploy --dry-run
  napplet deploy -i --format current --json`,
  keys: `Usage: napplet keys <store|connect|use|list|delete|doctor> [options]

  --name <reference>     Local key reference
  --sec <secret>         Secret to store; never written to project config
  --prompt-sec           Read hidden or explicitly piped secret input
  --relay <url>          Remote signer connection relay (repeatable)
  --config <file>        Project to configure with keys use/connect

keys connect requires interactive approval on your signer.
With -i, use an existing key or bunker session instead.
Encrypted local storage uses NAPPLET_KEYSTORE_PASSWORD in CI.`,
  conformance: `Usage: napplet conformance [--config <file>] [--all] [-- <args>]

Checks discovered builds with the managed conformance runner.
Runner options go after --.
Example: napplet conformance -i -- --json`,
  paja: `Usage: napplet paja [--config <file>] [-- <args>]

Starts the managed development shell. Shell options go after --.
Example: napplet paja -- pnpm vite --host 127.0.0.1`,
  screenshot: `Usage: napplet screenshot [directory|preview-url] [options]

  --output <file>         Output image (default: preview.png)
  --selector <css>        Capture target (default: iframe)
  --ready-selector <css>  Wait for this element
  --width <pixels>        Viewport width (default: 1200)
  --height <pixels>       Viewport height (default: 750)
  --delay <milliseconds>  Wait before capture (default: 1500)`,
  debug: `Usage: napplet debug [--config <file>] [--all] [--name <name>]

Prints JSON describing builds, signing configuration, and event templates.
Supports --format current|legacy, --root, --snapshot and --sec.
Does not prompt, upload, or publish.`,
  discover: `Usage: napplet discover [--config <file>] [--all]

Prints discovered build directories as JSON. Use --all to search recursively.`,
  migrate: `Usage: napplet migrate <signed-event.json> [options]

  --description <text>  Supply the new manifest description
  --optional <domain>   Mark a capability optional (repeatable)
  --output <file>       Write a preview without overwriting a file

Offline preview only; does not sign or publish.`,
};

/**
 * Select help scoped to one command.
 * @param command Command name.
 * @returns Detailed usage or the overview for unknown names.
 * @example commandHelp("deploy")
 */
export function commandHelp(command: string): string {
  const detail = details[command];
  return detail ? `${detail}\n\nAll commands: -i/--non-interactive, --no-color, --help\n` : HELP;
}
