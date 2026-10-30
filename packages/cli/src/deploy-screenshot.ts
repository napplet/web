/** Temporary preview capture for an application metadata deployment. */
import { first, type FlagBag } from "./flags.ts";
import { runPackageCli } from "./package-runner.ts";
import { joinPath } from "./path.ts";
import { buildMediaTag, mediaUploadPath } from "./manifest-media.ts";
import type { DeployManifestTemplate, DeployPlan, NappletConfig } from "./types.ts";

/** Captured image owned by the current deployment. */
export interface DeployScreenshot {
  paths: string[];
  /** Each capture and the built artifact it previewed; a URL capture names no artifact. */
  captures: Array<{ path: string; indexHtml?: string }>;
  cleanup(): Promise<void>;
}

/**
 * Capture a temporary image when deploy requests an inline screenshot.
 * @param flags Deploy flags; screenshot may optionally supply a preview URL.
 * @param config Application publication configuration.
 * @param run Optional browser runner override for tests or embedded callers.
 * @param plan Selected build artifacts to preview automatically.
 * @returns Capture and cleanup handle, or undefined when not requested.
 * @example await captureDeployScreenshot(flags, config)
 */
export async function captureDeployScreenshot(
  flags: FlagBag,
  config: NappletConfig,
  run: (args: readonly string[]) => number | Promise<number> = (args) =>
    runPackageCli("@napplet/conformance-cli", args, {
      writeStdout: console.error,
      writeStderr: console.error,
    }),
  plan?: DeployPlan,
): Promise<DeployScreenshot | undefined> {
  const url = first(flags.values.get("screenshot"));
  const controls = ["selector", "ready-selector", "width", "height", "delay"];
  const requested = !!url || flags.boolean.has("screenshot");
  const configured = controls.some((name) => flags.values.has(`screenshot-${name}`));
  if (flags.boolean.has("no-screenshot")) {
    if (requested || configured) {
      throw new Error("Choose either --screenshot options or --no-screenshot");
    }
    return undefined;
  }
  if (flags.boolean.has("no-zapstore")) {
    if (requested || configured) throw new Error("Screenshot options require Zapstore publication; remove --no-zapstore");
    return undefined;
  }
  if (config.zapstore?.enabled === false && !flags.boolean.has("zapstore")) {
    if (requested || configured) throw new Error("Screenshot options require Zapstore publication; use --zapstore");
    return undefined;
  }
  if (!config.zapstore) {
    throw new Error("Screenshot capture requires application metadata");
  }
  const artifacts = [...new Set(plan?.items.map((item) => item.candidate.indexHtml) ?? [])];
  if (!url && !artifacts.length) throw new Error("No selected build to screenshot");
  const directory = await Deno.makeTempDir({ prefix: "napplet-deploy-screenshot-" });
  const paths: string[] = [];
  const captures: DeployScreenshot["captures"] = [];
  const cleanup = () => Deno.remove(directory, { recursive: true });
  try {
    for (const target of url ? [url] : artifacts) {
      const path = joinPath(directory, `preview-${paths.length}.png`);
      captures.push(url ? { path } : { path, indexHtml: target });
      const args = url ? [target] : ["--artifact", target];
      args.push("--output", path);
      for (const control of controls) {
        const value = first(flags.values.get(`screenshot-${control}`));
        if (value !== undefined) args.push(`--${control}`, value);
      }
      const code = await run(args);
      if (code !== 0) throw new Error(`Screenshot capture failed (exit ${code}); deployment stopped`);
      paths.push(path);
    }
    return { paths, captures, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

/**
 * Add each capture to the current-format manifests of the artifact it previewed as a
 * NIP-5D `screenshot` tag, and queue the bytes for upload with the artifact.
 * Explicit `metadata.screenshots` configuration keeps its own list instead.
 * @param templates Deployment manifest templates, modified in place before signing.
 * @param screenshot Capture handle from {@link captureDeployScreenshot}.
 * @param config Deployment configuration.
 * @example await attachCapturedScreenshots(templates, screenshot, config)
 */
export async function attachCapturedScreenshots(
  templates: readonly DeployManifestTemplate[],
  screenshot: DeployScreenshot | undefined,
  config: Pick<NappletConfig, "metadata">,
): Promise<void> {
  if (!screenshot || config.metadata?.screenshots !== undefined) return;
  for (const capture of screenshot.captures) {
    const data = await Deno.readFile(capture.path);
    const { tag, blob } = await buildMediaTag("screenshot", data, { label: "captured screenshot" });
    for (const manifest of templates) {
      if (!manifest.template || manifest.format === "legacy") continue;
      if (capture.indexHtml && manifest.item.candidate.indexHtml !== capture.indexHtml) continue;
      if (!manifest.template.tags.some((t) => t[0] === "screenshot" && t[1] === `x ${blob.sha256}`)) {
        manifest.template.tags.push(tag);
      }
      if (!manifest.files.some((file) => file.sha256 === blob.sha256)) {
        manifest.files.push({ path: mediaUploadPath("screenshot", blob), ...blob });
      }
    }
  }
}
