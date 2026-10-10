/** Temporary preview capture for an application metadata deployment. */
import { first, type FlagBag } from "./flags.ts";
import { runPackageCli } from "./package-runner.ts";
import { joinPath } from "./path.ts";
import type { NappletConfig } from "./types.ts";

/** Captured image owned by the current deployment. */
export interface DeployScreenshot {
  path: string;
  cleanup(): Promise<void>;
}

/**
 * Capture a temporary image when deploy requests an inline screenshot.
 * @param flags Deploy flags; screenshot is the running preview URL.
 * @param config Application publication configuration.
 * @param run Optional browser runner override for tests or embedded callers.
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
): Promise<DeployScreenshot | undefined> {
  const url = first(flags.values.get("screenshot"));
  const controls = ["selector", "ready-selector", "width", "height", "delay"];
  if (!url) {
    if (controls.some((name) => flags.values.has(`screenshot-${name}`))) {
      throw new Error("Screenshot options require --screenshot <preview-url>");
    }
    return undefined;
  }
  if (
    flags.boolean.has("no-zapstore") || !(flags.boolean.has("zapstore") || config.zapstore?.enabled)
  ) {
    throw new Error("--screenshot requires --zapstore or zapstore.enabled in config");
  }
  if (!config.zapstore) {
    throw new Error("--screenshot requires zapstore.id and zapstore.name in config");
  }
  const directory = await Deno.makeTempDir({ prefix: "napplet-deploy-screenshot-" });
  const path = joinPath(directory, "preview.png");
  const cleanup = () => Deno.remove(directory, { recursive: true });
  try {
    const args = [url, "--output", path];
    for (const control of controls) {
      const value = first(flags.values.get(`screenshot-${control}`));
      if (value !== undefined) args.push(`--${control}`, value);
    }
    const code = await run(args);
    if (code !== 0) throw new Error(`Screenshot capture failed (exit ${code}); deployment stopped`);
    return { path, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
