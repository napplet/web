#!/bin/sh
set -eu

RELEASE_BASE="${NAPPLET_CLI_RELEASE_BASE:-https://github.com/napplet/web/releases/download/napplet-cli}"
if [ "${NAPPLET_CLI_INSTALL_DIR+x}" = x ]; then
  INSTALL_DIR=$NAPPLET_CLI_INSTALL_DIR
else
  # Upgrade the binary the shell already resolves when one exists. This avoids
  # silently leaving an older napplet earlier on PATH (for example ~/.deno/bin).
  existing_napplet=$(command -v napplet 2>/dev/null || true)
  case "$existing_napplet" in
    */napplet) INSTALL_DIR=${existing_napplet%/napplet} ;;
    *) INSTALL_DIR="$HOME/.local/bin" ;;
  esac
fi
PLATFORM="${NAPPLET_CLI_PLATFORM:-$(uname -s)}"
ARCH="${NAPPLET_CLI_ARCH:-$(uname -m)}"

case "$PLATFORM" in
  Darwin|darwin) os=darwin ;;
  Linux|linux) os=linux ;;
  *)
    printf 'napplet: unsupported operating system: %s\n' "$PLATFORM" >&2
    exit 1
    ;;
esac

case "$ARCH" in
  x86_64|amd64) arch=x86_64 ;;
  arm64|aarch64) arch=aarch64 ;;
  *)
    printf 'napplet: unsupported architecture: %s\n' "$ARCH" >&2
    exit 1
    ;;
esac

asset="napplet-${os}-${arch}"
tmp_dir=$(mktemp -d "${TMPDIR:-/tmp}/napplet-install.XXXXXX")
trap 'rm -rf "$tmp_dir"' EXIT HUP INT TERM

download() {
  source_url=$1
  destination=$2
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$source_url" -o "$destination"
  elif command -v wget >/dev/null 2>&1; then
    wget -q "$source_url" -O "$destination"
  else
    printf 'napplet: curl or wget is required\n' >&2
    exit 1
  fi
}

download "${RELEASE_BASE}/${asset}" "${tmp_dir}/${asset}"
download "${RELEASE_BASE}/SHA256SUMS" "${tmp_dir}/SHA256SUMS"

expected=$(awk -v name="$asset" '$2 == name { print $1; exit }' "${tmp_dir}/SHA256SUMS")
if [ -z "$expected" ]; then
  printf 'napplet: %s is missing from SHA256SUMS\n' "$asset" >&2
  exit 1
fi

if command -v sha256sum >/dev/null 2>&1; then
  actual=$(sha256sum "${tmp_dir}/${asset}" | awk '{ print $1 }')
elif command -v shasum >/dev/null 2>&1; then
  actual=$(shasum -a 256 "${tmp_dir}/${asset}" | awk '{ print $1 }')
else
  printf 'napplet: sha256sum or shasum is required\n' >&2
  exit 1
fi

if [ "$actual" != "$expected" ]; then
  printf 'napplet: checksum verification failed for %s\n' "$asset" >&2
  exit 1
fi

mkdir -p "$INSTALL_DIR"
chmod 0755 "${tmp_dir}/${asset}"
staged="${INSTALL_DIR}/.napplet.new.$$"
cp "${tmp_dir}/${asset}" "$staged"
mv -f "$staged" "${INSTALL_DIR}/napplet"

printf 'Installed napplet to %s/napplet\n' "$INSTALL_DIR"
case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *) printf 'Add %s to PATH before running napplet.\n' "$INSTALL_DIR" ;;
esac

if [ -t 1 ]; then
  printf '\033[1;36mtry running \033[1;97m'"'"'napplet guide'"'"'\033[0m\n'
else
  printf "try running 'napplet guide'\n"
fi
