[CmdletBinding()]
param(
  [string]$ReleaseBase = $(if ($env:NAPPLET_CLI_RELEASE_BASE) { $env:NAPPLET_CLI_RELEASE_BASE } else { 'https://github.com/napplet/napplet/releases/download/napplet-cli' }),
  [string]$InstallDir = $(if ($env:NAPPLET_CLI_INSTALL_DIR) { $env:NAPPLET_CLI_INSTALL_DIR } else { Join-Path $HOME '.local\bin' })
)

$ErrorActionPreference = 'Stop'
$architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
if ($architecture -ne 'X64') {
  throw "napplet: unsupported Windows architecture: $architecture"
}

$asset = 'napplet-windows-x86_64.exe'
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("napplet-install-" + [System.Guid]::NewGuid())
New-Item -ItemType Directory -Path $tempDir | Out-Null

try {
  $binaryPath = Join-Path $tempDir $asset
  $sumsPath = Join-Path $tempDir 'SHA256SUMS'
  Invoke-WebRequest -UseBasicParsing -Uri "$ReleaseBase/$asset" -OutFile $binaryPath
  Invoke-WebRequest -UseBasicParsing -Uri "$ReleaseBase/SHA256SUMS" -OutFile $sumsPath

  $entry = Get-Content $sumsPath | Where-Object { $_ -match "^[0-9a-fA-F]{64}\s+$([regex]::Escape($asset))$" } | Select-Object -First 1
  if (-not $entry) {
    throw "napplet: $asset is missing from SHA256SUMS"
  }
  $expected = ($entry -split '\s+')[0].ToLowerInvariant()
  $actual = (Get-FileHash -Algorithm SHA256 -Path $binaryPath).Hash.ToLowerInvariant()
  if ($actual -ne $expected) {
    throw "napplet: checksum verification failed for $asset"
  }

  New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
  $destination = Join-Path $InstallDir 'napplet.exe'
  $staged = Join-Path $InstallDir ('.napplet.new.' + $PID + '.exe')
  Copy-Item -Force $binaryPath $staged
  Move-Item -Force $staged $destination
  Write-Host "Installed napplet to $destination"
} finally {
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $tempDir
}
