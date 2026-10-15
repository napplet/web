/** Provision a pinned private Node distribution for maintained browser tooling. */
import { dirname, join, delimiter } from "node:path";
import { extractToolArchive } from "./tool-archive.ts";
import { cacheFileExists, toolCacheDir } from "./tool-cache.ts";
import type { ResolvedCommand } from "./package-runner.ts";

const NODE_VERSION = "22.23.3";
// Published at https://nodejs.org/dist/v22.23.3/SHASUMS256.txt.
const DISTRIBUTIONS: Record<string, { name: string; sha256: string }> = {
  "darwin-aarch64": { name: "darwin-arm64", sha256: "23b25245dcfb9af7262f8ff142e9e2e0af025368117329e7a7458a51e5922f53" },
  "darwin-x86_64": { name: "darwin-x64", sha256: "8a677b0219178efd6eb0e475457c4afb452b521a92f6e67845a73bd85727f2a8" },
  "linux-aarch64": { name: "linux-arm64", sha256: "5ced2d48d1d7198739b7f86804de0171aefb6823b684b12341d3321afc3cb0b2" },
  "linux-x86_64": { name: "linux-x64", sha256: "1084aa36196bba4c3a5e69a1ee388a6e4ff729dad09445fbcd434b28fe3c24af" },
  "windows-x86_64": { name: "win-x64", sha256: "2b0ff57b049cda1bbcea2240eec20467018713c1efe1f7360c2681859b90ed71" },
};

export interface ManagedNode {
  executable: string;
  npmCli: string;
  env: Record<string, string>;
}

/**
 * Describe the runtime asset for a supported release target.
 * @param target Deno OS and architecture joined by a hyphen.
 * @returns Pinned asset URL and digest.
 * @example nodeDistribution('darwin-aarch64')
 */
export function nodeDistribution(target: string): { url: string; sha256: string; root: string; format: "zip" | "tar.gz" } {
  const distribution = DISTRIBUTIONS[target];
  if (!distribution) throw new Error(`Unsupported standalone tooling platform: ${target}`);
  const root = `node-v${NODE_VERSION}-${distribution.name}`;
  const format = target.startsWith("windows-") ? "zip" : "tar.gz";
  return { url: `https://nodejs.org/dist/v${NODE_VERSION}/${root}.${format}`, root, format, sha256: distribution.sha256 };
}

/**
 * Verify downloaded bytes before any archive extraction or execution.
 * @param bytes Downloaded payload.
 * @param expected Published SHA-256 digest.
 * @returns Resolves only for matching bytes.
 * @example await verifyToolDownload(bytes, expected)
 */
export async function verifyToolDownload(bytes: Uint8Array, expected: string): Promise<void> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)));
  const actual = [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (actual !== expected) throw new Error("Tooling download checksum mismatch; nothing was installed");
}

/**
 * Obtain a runtime without consulting host Node/npm/npx installations.
 * @returns Private executable, npm script and environment for its children.
 * @example const node = await ensureManagedNode()
 */
export async function ensureManagedNode(): Promise<ManagedNode> {
  const asset = nodeDistribution(`${Deno.build.os}-${Deno.build.arch}`);
  const cache = toolCacheDir();
  const destination = join(cache, asset.root);
  if (!await cacheFileExists(join(destination, ".ready"))) {
    console.error(`Downloading private CLI runtime (Node ${NODE_VERSION})...`);
    await Deno.mkdir(cache, { recursive: true });
    const staging = await Deno.makeTempDir({ dir: cache, prefix: "node-install-" });
    try {
      const response = await fetch(asset.url, { signal: AbortSignal.timeout(180000) });
      if (!response.ok) throw new Error(`Runtime download failed: HTTP ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      await verifyToolDownload(bytes, asset.sha256);
      await extractToolArchive(bytes, asset.format, staging);
      const extracted = join(staging, asset.root);
      await Deno.writeTextFile(join(extracted, ".ready"), NODE_VERSION);
      try { await Deno.rename(extracted, destination); }
      catch (error) { if (!await cacheFileExists(join(destination, ".ready"))) throw error; }
    } finally { await Deno.remove(staging, { recursive: true }); }
  }
  const windows = Deno.build.os === "windows";
  const executable = join(destination, windows ? "node.exe" : "bin/node");
  const npmCli = join(destination, windows ? "node_modules/npm/bin/npm-cli.js" : "lib/node_modules/npm/bin/npm-cli.js");
  return {
    executable, npmCli,
    env: {
      PATH: `${dirname(executable)}${delimiter}${Deno.env.get("PATH") ?? ""}`,
      npm_config_cache: join(cache, "npm"),
      PLAYWRIGHT_BROWSERS_PATH: join(cache, "browsers", `${Deno.build.os}-${Deno.build.arch}`),
    },
  };
}

/**
 * Install an exact maintained package in a private prefix and address its entrypoint directly.
 * @param spec Exact package version.
 * @param entry Package-relative CLI script.
 * @returns Absolute executable/script and environment, independent of project dependencies.
 * @example await managedPackageCommand('@napplet/conformance-cli@0.3.4', 'dist/cli.js')
 */
export async function managedPackageCommand(spec: string, entry: string): Promise<ResolvedCommand> {
  const node = await ensureManagedNode();
  const name = spec.slice(0, spec.lastIndexOf("@"));
  const cache = toolCacheDir();
  const browserTool = name === "@napplet/conformance-cli";
  const launcherName = browserTool ? "browser-cli.mjs" : name === "@kehto/cli" ? "paja-cli.mjs" : undefined;
  const launcherSource = browserTool ? BROWSER_LAUNCHER : PAJA_LAUNCHER;
  const destination = join(cache, "packages", `${spec.replace(/[^a-z0-9.-]/gi, "_")}-${Deno.build.os}-${Deno.build.arch}-v1`);
  const script = join(destination, "node_modules", name, entry);
  if (!await cacheFileExists(join(destination, ".ready"))) {
    console.error(`Installing private CLI tool ${spec}...`);
    await Deno.mkdir(dirname(destination), { recursive: true });
    const staging = await Deno.makeTempDir({ dir: dirname(destination), prefix: "package-install-" });
    try {
      await Deno.writeTextFile(join(staging, "package.json"), '{"private":true}');
      await Deno.writeTextFile(join(staging, "npmrc"), "");
      const result = await new Deno.Command(node.executable, {
        args: [node.npmCli, "install", "--prefix", staging, "--ignore-scripts", "--no-audit", "--no-fund", "--registry=https://registry.npmjs.org", "--userconfig", join(staging, "npmrc"), "--globalconfig", join(staging, "global-npmrc"), spec,
          ...(browserTool ? ["playwright@1.59.1"] : []),
          ...(browserTool && Deno.build.os === "linux" ? ["@sparticuz/chromium-min@153.0.0"] : [])],
        cwd: staging, env: node.env, stdin: "null", stdout: "piped", stderr: "piped",
      }).output();
      if (!result.success) throw new Error(`Private tool install failed: ${new TextDecoder().decode(result.stderr)}`);
      if (!await cacheFileExists(join(staging, "node_modules", name, entry))) throw new Error(`Tool entrypoint missing: ${spec}`);
      if (browserTool && Deno.build.os === "linux") {
        const arch = Deno.build.arch === "aarch64" ? "arm64" : "x64";
        const url = `https://github.com/Sparticuz/chromium/releases/download/v153.0.0/chromium-v153.0.0-pack.${arch}.tar`;
        const response = await fetch(url, { signal: AbortSignal.timeout(180000) });
        if (!response.ok) throw new Error(`Chromium download failed: HTTP ${response.status}`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        await verifyToolDownload(bytes, arch === "arm64" ? "b6874fc0d7af15e16a15ef1b73177731f698c296c73d26aa4a90840c0777a338" : "91b9f56d35a2cbb14279a1cbdaf1c86c0faa5fd82315bdd7334ff93bf35f224d");
        await extractToolArchive(bytes, "tar", join(staging, "chromium-pack"));
      }
      if (launcherName) await Deno.writeTextFile(join(staging, launcherName), launcherSource);
      await Deno.writeTextFile(join(staging, ".ready"), spec);
      try { await Deno.rename(staging, destination); }
      catch (error) { if (!await cacheFileExists(join(destination, ".ready"))) throw error; }
    } finally { await Deno.remove(staging, { recursive: true }).catch((error) => { if (!(error instanceof Deno.errors.NotFound)) throw error; }); }
  }
  if (launcherName) {
    const launcher = join(destination, launcherName);
    if (!await cacheFileExists(launcher) || await Deno.readTextFile(launcher) !== launcherSource) {
      const staging = await Deno.makeTempFile({ dir: destination, prefix: "launcher-" });
      try {
        await Deno.writeTextFile(staging, launcherSource);
        await Deno.rename(staging, launcher);
      } finally { await Deno.remove(staging).catch((error) => { if (!(error instanceof Deno.errors.NotFound)) throw error; }); }
    }
  }
  return { command: node.executable, args: launcherName ? [join(destination, launcherName), script] : [script], env: node.env };
}

// Kehto's direct-entry guard uses POSIX path suffixes; call its exported CLI on every OS.
const PAJA_LAUNCHER = `
const { pathToFileURL } = await import('node:url');
const script = process.argv.splice(2, 1)[0];
const { runKehtoCli } = await import(pathToFileURL(script).href);
process.exitCode = await runKehtoCli(process.argv.slice(2));
`;

// Adapt only the private tool copy; maintained capture/check logic remains authoritative.
const BROWSER_LAUNCHER = `
import { createRequire } from 'node:module';
import { access, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const { dirname, join } = await import('node:path');
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const script = process.argv.splice(2, 1)[0];
process.argv[1] = script;
if (!process.argv.includes('--help') && !process.argv.includes('-h') && !process.argv.includes('--ui')) {
  if (process.platform === 'linux') {
    const scratch = mkdtempSync(join(tmpdir(), 'napplet-chromium-'));
    process.env.TMPDIR = scratch;
    process.on('exit', () => rmSync(scratch, { recursive: true, force: true }));
    const { default: portable, inflate, setupLambdaEnvironment } = await import('@sparticuz/chromium-min');
    const pack = join(dirname(script), '..', '..', '..', '..', 'chromium-pack');
    await inflate(join(pack, 'al2023.tar.br'));
    await inflate(join(pack, 'fonts.tar.br'));
    const fontConfig = join(scratch, 'fonts', 'fonts.conf');
    await writeFile(fontConfig, (await readFile(fontConfig, 'utf8')).replaceAll('/tmp/', scratch + '/'));
    process.env.FONTCONFIG_PATH = join(scratch, 'fonts');
    setupLambdaEnvironment(join(scratch, 'al2023', 'lib'));
    const executablePath = await portable.executablePath(pack);
    const launch = chromium.launch.bind(chromium);
    chromium.executablePath = () => executablePath;
    chromium.launch = (options = {}) => {
      const { channel, ...rest } = options;
      return launch({ ...rest, executablePath, args: [...portable.args.filter(arg => !arg.startsWith('--disable-web-security') && !arg.startsWith('--disable-site-isolation') && !arg.startsWith('--disable-features=') && arg !== '--allow-running-insecure-content'), ...(rest.args ?? [])] });
    };
  } else {
    try { await access(chromium.executablePath()); }
    catch {
      console.error('Installing private Chromium...');
      execFileSync(process.execPath, [join(dirname(require.resolve('playwright/package.json')), 'cli.js'), 'install', 'chromium'], { stdio: ['ignore', 'ignore', 'inherit'], timeout: 180000 });
    }
  }
}
await import(pathToFileURL(script).href);
`;
