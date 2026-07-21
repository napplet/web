#!/usr/bin/env bash
#
# setup-site-secrets.sh — configure GitHub secrets + variables for the
# "Deploy site" workflow (.github/workflows/deploy-site.yml).
#
# It sets, via the GitHub CLI:
#   Secrets (sensitive):
#     NBUNK_SECRET            nsite bunker credential from `nsyte ci` (nbunksec1...)
#     BUNNY_STORAGE_ZONE      Bunny Storage Zone name
#     BUNNY_STORAGE_PASSWORD  Bunny Storage Zone password (read/write)
#     BUNNY_STORAGE_ENDPOINT  Bunny storage host (bare, no scheme), e.g. storage.bunnycdn.com
#     BUNNY_PULLZONE_ID       Bunny Pull Zone numeric id (for cache purge)
#     BUNNY_API_KEY           Bunny account API key (for cache purge)
#   Variables (non-sensitive, optional — Enter to keep defaults):
#     NSITE_RELAYS            newline/space separated relay URIs
#     NSITE_SERVERS           newline/space separated Blossom server URIs
#
# Nothing is echoed back. Re-running overwrites existing values. Press Enter at
# any secret prompt to SKIP that one (leave it unchanged).
#
# Usage:
#   ./scripts/setup-site-secrets.sh [owner/repo]
# If owner/repo is omitted, the repo for the current directory is used.

set -euo pipefail

DEFAULT_RELAYS="wss://relay.nsite.lol"
DEFAULT_SERVERS="https://cdn.hzrd149.com"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
dim() { printf '\033[2m%s\033[0m\n' "$1"; }
ok() { printf '\033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '\033[33m!\033[0m %s\n' "$1"; }
err() { printf '\033[31m✗\033[0m %s\n' "$1" >&2; }

# ─── Preflight ────────────────────────────────────────────────────────────────
if ! command -v gh >/dev/null 2>&1; then
  err "GitHub CLI (gh) is not installed. See https://cli.github.com/"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  err "gh is not authenticated. Run: gh auth login"
  exit 1
fi

REPO="${1:-}"
REPO_ARGS=()
if [[ -n "$REPO" ]]; then
  REPO_ARGS=(--repo "$REPO")
else
  if ! REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null)"; then
    err "Not inside a GitHub repo and no owner/repo argument given."
    err "Usage: $0 [owner/repo]"
    exit 1
  fi
fi

bold "Configuring deploy secrets for: $REPO"
echo
dim "Press Enter to skip any prompt and leave that value unchanged."
echo

# set_secret NAME PROMPT [validator_fn]
set_secret() {
  local name="$1" prompt="$2" validator="${3:-}"
  local value=""
  # -s: silent (no echo) for sensitive input
  read -r -s -p "  $prompt: " value
  echo
  if [[ -z "$value" ]]; then
    dim "    skipped $name"
    return 0
  fi
  if [[ -n "$validator" ]] && ! "$validator" "$value"; then
    return 0
  fi
  # NOTE: omit --body so gh reads the value from stdin. `--body -` does NOT mean
  # "read from stdin" — it stores the literal string "-". Piping into a bare
  # `gh secret set NAME` is the correct way to set a value with no trailing
  # newline.
  if printf '%s' "$value" | gh secret set "$name" "${REPO_ARGS[@]}" ; then
    ok "set secret $name"
  else
    err "failed to set $name"
  fi
}

# set_var NAME PROMPT DEFAULT
set_var() {
  local name="$1" prompt="$2" default="$3" value=""
  read -r -p "  $prompt [$default]: " value
  value="${value:-$default}"
  if gh variable set "$name" "${REPO_ARGS[@]}" --body "$value" >/dev/null; then
    ok "set variable $name = $value"
  else
    err "failed to set variable $name"
  fi
}

validate_nbunksec() {
  if [[ "$1" != nbunksec1* ]]; then
    err "Refusing: nsite credential must start with 'nbunksec1' (got something else)."
    err "Generate one safely with: nsyte ci   — never paste an nsec/sec1 private key."
    return 1
  fi
  return 0
}

# ─── nsite ────────────────────────────────────────────────────────────────────
bold "1. nsite (Nostr / Blossom)"
dim "   Generate the credential with: nsyte ci  (it prints an nbunksec1... value)"
set_secret NBUNK_SECRET "NBUNK_SECRET (nbunksec1...)" validate_nbunksec
echo

# ─── Bunny storage ────────────────────────────────────────────────────────────
bold "2. Bunny — Storage Zone (file upload)"
dim "   Bunny dashboard → Storage → your zone → FTP & API Access"
set_secret BUNNY_STORAGE_ZONE "BUNNY_STORAGE_ZONE (zone name)"
set_secret BUNNY_STORAGE_PASSWORD "BUNNY_STORAGE_PASSWORD (read/write password)"
dim "   BARE HOSTNAME, no https:// — e.g. storage.bunnycdn.com (or a regional host"
dim "   like ny.storage.bunnycdn.com). The deploy workflow strips a scheme if present."
set_secret BUNNY_STORAGE_ENDPOINT "BUNNY_STORAGE_ENDPOINT (bare host, e.g. storage.bunnycdn.com)"
echo

# ─── Bunny pull zone purge ────────────────────────────────────────────────────
bold "3. Bunny — Pull Zone (cache purge)"
dim "   Pull Zone id: dashboard → CDN → your pull zone (numeric id in the URL)."
set_secret BUNNY_PULLZONE_ID "BUNNY_PULLZONE_ID (numeric)"
dim "   API key: dashboard → Account Settings → API → Account API Key."
set_secret BUNNY_API_KEY "BUNNY_API_KEY (account API key)"
echo

# ─── nsite targets (variables) ────────────────────────────────────────────────
bold "4. nsite relays & Blossom servers (non-secret, optional)"
set_var NSITE_RELAYS "Relays (space or newline separated)" "$DEFAULT_RELAYS"
set_var NSITE_SERVERS "Blossom servers" "$DEFAULT_SERVERS"
echo

bold "Done."
dim "Review what's set:"
echo "  gh secret list ${REPO_ARGS[*]}"
echo "  gh variable list ${REPO_ARGS[*]}"
echo
dim "Trigger a deploy:"
echo "  gh workflow run 'Deploy site' ${REPO_ARGS[*]}"
