import { nip19 } from "nostr-tools";
import { contentType } from "@std/media-types";
import { extname } from "@std/path";
import { capturePajaIframePng } from "./browser-cdp.ts";
import { type CommandResult, splitCommand } from "./process.ts";
import { basename, dirname, joinPath, normalizePath, relativePath, resolvePath } from "./path.ts";
import type { NappletCandidate, NappletConfig } from "./types.ts";

export const DEFAULT_SCREENSHOT_IDENTITY =
  "npub1uac67zc9er54ln0kl6e4qp2y6ta3enfcg7ywnayshvlw9r5w6ehsqq99rx";
export const DEFAULT_SCREENSHOT_DIR = "screenshots";
export const DEFAULT_SCREENSHOT_WIDTH = 1280;
export const DEFAULT_SCREENSHOT_HEIGHT = 800;
export const DEFAULT_SCREENSHOT_TIMEOUT_MS = 30_000;

export interface ScreenshotCliOptions {
  configPath?: string;
  all?: boolean;
  names?: string[];
  outDir?: string;
  file?: string;
  identity?: string;
  targetUrl?: string;
  browser?: string;
  width?: number;
  height?: number;
  timeoutMs?: number;
  pajaArgs?: string[];
}

export interface ScreenshotPlanItem {
  candidate: NappletCandidate;
  targetUrl?: string;
  outPath: string;
  manifestPath: string;
}

export interface ScreenshotCaptureResult {
  candidate: string;
  path: string;
  manifestPath: string;
  bytes: number;
}

interface PajaRuntime {
  url: string;
  close(): Promise<void>;
}

interface StaticServer {
  url: string;
  close(): Promise<void>;
}

export function createScreenshotPlan(
  candidates: readonly NappletCandidate[],
  options: Pick<ScreenshotCliOptions, "all" | "names" | "outDir" | "file" | "targetUrl"> = {},
): ScreenshotPlanItem[] {
  const selected = selectScreenshotCandidates(candidates, options);
  return selected.map((candidate) => {
    const fileName = options.file ?? `${safeFileSegment(candidate.name)}.png`;
    const relativeOut = normalizeScreenshotOutput(
      options.outDir ?? DEFAULT_SCREENSHOT_DIR,
      fileName,
    );
    const outPath = joinPath(candidate.dir, relativeOut);
    return {
      candidate,
      targetUrl: options.targetUrl,
      outPath,
      manifestPath: `/${relativeOut}`,
    };
  });
}

export async function captureScreenshots(
  config: NappletConfig,
  plan: readonly ScreenshotPlanItem[],
  options: Pick<
    ScreenshotCliOptions,
    "identity" | "browser" | "width" | "height" | "timeoutMs" | "pajaArgs"
  > = {},
): Promise<ScreenshotCaptureResult[]> {
  const identityHex = normalizeScreenshotIdentity(
    options.identity ?? config.screenshot?.identity ??
      DEFAULT_SCREENSHOT_IDENTITY,
  );
  const timeoutMs = options.timeoutMs ?? config.screenshot?.timeoutMs ??
    DEFAULT_SCREENSHOT_TIMEOUT_MS;
  const results: ScreenshotCaptureResult[] = [];
  for (const item of plan) {
    const staticServer = item.targetUrl
      ? undefined
      : await startStaticNappletServer(item.candidate.dir);
    const targetUrl = item.targetUrl ?? staticServer?.url;
    if (!targetUrl) throw new Error("Screenshot target URL could not be resolved");
    const paja = await startPajaRuntime(
      config,
      targetUrl,
      identityHex,
      timeoutMs,
      options.pajaArgs ?? [],
    );
    try {
      const png = await capturePajaIframePng({
        url: paja.url,
        browser: options.browser,
        width: options.width ?? config.screenshot?.width ?? DEFAULT_SCREENSHOT_WIDTH,
        height: options.height ?? config.screenshot?.height ?? DEFAULT_SCREENSHOT_HEIGHT,
        timeoutMs,
      });
      await Deno.mkdir(dirname(item.outPath), { recursive: true });
      await Deno.writeFile(item.outPath, png);
      results.push({
        candidate: item.candidate.name,
        path: item.outPath,
        manifestPath: item.manifestPath,
        bytes: png.byteLength,
      });
    } finally {
      await paja.close();
      await staticServer?.close();
    }
  }
  return results;
}

export function normalizeScreenshotIdentity(value: string): string {
  const trimmed = value.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return trimmed.toLowerCase();
  if (trimmed.startsWith("npub1")) {
    const decoded = nip19.decode(trimmed);
    if (decoded.type !== "npub" || typeof decoded.data !== "string") {
      throw new Error("Invalid npub identity");
    }
    return decoded.data;
  }
  throw new Error("Screenshot identity must be an npub or 64-character hex pubkey");
}

export function parsePositiveInt(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`--${label} must be a positive integer`);
  }
  return parsed;
}

function selectScreenshotCandidates(
  candidates: readonly NappletCandidate[],
  options: Pick<ScreenshotCliOptions, "all" | "names">,
): NappletCandidate[] {
  if (candidates.length === 0) throw new Error("No napplet candidates found");
  const names = options.names ?? [];
  if (names.length > 0) {
    const wanted = new Set(names);
    const selected = candidates.filter((candidate) => wanted.has(candidate.name));
    const missing = names.filter((name) => !selected.some((candidate) => candidate.name === name));
    if (missing.length > 0) throw new Error(`No napplet candidate named: ${missing.join(", ")}`);
    return selected;
  }
  if (options.all) return [...candidates];
  if (candidates.length > 1) {
    throw new Error("Multiple napplet candidates found; pass --name <candidate> or --all");
  }
  return [candidates[0]];
}

function normalizeScreenshotOutput(outDir: string, fileName: string): string {
  const normalizedDir = normalizePath(outDir.trim() || DEFAULT_SCREENSHOT_DIR);
  if (normalizedDir.startsWith("/") || normalizedDir === ".." || normalizedDir.startsWith("../")) {
    throw new Error("--out-dir must be relative to the napplet deploy directory");
  }
  const cleanName = basename(fileName.trim() || "screenshot.png");
  if (!/^[a-zA-Z0-9._-]+\.png$/.test(cleanName)) {
    throw new Error("--file must be a simple .png file name");
  }
  return normalizePath(joinPath(normalizedDir, cleanName));
}

function safeFileSegment(value: string): string {
  const segment = value
    .toLowerCase()
    .replaceAll(/[^a-z0-9_-]+/g, "-")
    .replaceAll(/^-|-$/g, "");
  return /[a-z0-9]/.test(segment) ? segment : "napplet";
}

async function startPajaRuntime(
  config: NappletConfig,
  targetUrl: string,
  identityPubkey: string,
  timeoutMs: number,
  extraArgs: readonly string[],
): Promise<PajaRuntime> {
  const base = splitCommand(config.paja?.command ?? "kehto");
  const args = [
    ...base.args,
    "paja",
    "--target-url",
    targetUrl,
    "--identity-mode",
    "fixed",
    "--identity-pubkey",
    identityPubkey,
    "--port",
    "0",
    ...extraArgs,
  ];
  const child = new Deno.Command(base.command, {
    args,
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const runtimeUrl = await waitForPajaRuntimeUrl(child, timeoutMs);
  return {
    url: runtimeUrl,
    async close() {
      try {
        child.kill("SIGTERM");
      } catch {
        // Already exited.
      }
      await child.status.catch(() => undefined);
    },
  };
}

async function waitForPajaRuntimeUrl(
  child: Deno.ChildProcess,
  timeoutMs: number,
): Promise<string> {
  const stdout = readProcessOutput(child.stdout);
  const stderr = readProcessOutput(child.stderr);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const out = stdout.text();
    const match = out.match(/Runtime URL:\s*(\S+)/);
    if (match?.[1]) return match[1];
    const status = await Promise.race([child.status, delay(100).then(() => null)]);
    if (status) {
      throw new Error(
        `Paja exited before reporting Runtime URL (code ${status.code}): ${
          stderr.text() || out || "no output"
        }`,
      );
    }
  }
  throw new Error(`Timed out waiting for Paja Runtime URL: ${stderr.text() || stdout.text()}`);
}

function readProcessOutput(stream: ReadableStream<Uint8Array>): { text(): string } {
  const decoder = new TextDecoder();
  let text = "";
  void (async () => {
    const reader = stream.getReader();
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        text += decoder.decode(chunk.value, { stream: true });
      }
    } finally {
      reader.releaseLock();
    }
  })();
  return { text: () => text };
}

async function startStaticNappletServer(root: string): Promise<StaticServer> {
  let url = "";
  const controller = new AbortController();
  const listening = new Promise<void>((resolve) => {
    Deno.serve({
      hostname: "127.0.0.1",
      port: 0,
      signal: controller.signal,
      onListen(address) {
        url = `http://${address.hostname}:${address.port}/`;
        resolve();
      },
    }, (request) => serveStaticFile(root, request));
  });
  await listening;
  return {
    url,
    async close() {
      controller.abort();
      await delay(0);
    },
  };
}

async function serveStaticFile(root: string, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const decodedPath = decodeURIComponent(url.pathname);
  const requested = decodedPath === "/" ? "index.html" : decodedPath.slice(1);
  const relative = normalizePath(requested);
  if (relative === ".." || relative.startsWith("../") || relative.startsWith("/")) {
    return new Response("Forbidden", { status: 403 });
  }
  const path = resolvePath(root, relative);
  try {
    const stat = await Deno.stat(path);
    if (stat.isDirectory) return await serveStaticPath(joinPath(path, "index.html"));
    if (!stat.isFile) return new Response("Not found", { status: 404 });
    return await serveStaticPath(path);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return new Response("Not found", { status: 404 });
    throw error;
  }
}

async function serveStaticPath(path: string): Promise<Response> {
  const body = await Deno.readFile(path);
  return new Response(body, {
    headers: {
      "content-type": contentType(extname(path)) ?? "application/octet-stream",
      "cache-control": "no-store",
    },
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatScreenshotResults(
  results: readonly ScreenshotCaptureResult[],
): CommandResult {
  return {
    code: results.length > 0 ? 0 : 1,
    stdout: `${JSON.stringify({ screenshots: results }, null, 2)}\n`,
    stderr: "",
  };
}

export function toDeployRelativePath(candidateDir: string, outPath: string): string {
  return `/${relativePath(candidateDir, outPath)}`;
}
