/** CLI-only format selection; current libraries never infer legacy fallback. */
import { promptLine } from "./prompt.ts";
export type ManifestFormat = "current" | "legacy";

/**
 * Select the deployment format, prompting only for interactive deployments.
 * @param value Explicit --format value, when supplied.
 * @param interactive Whether prompting is available.
 * @param ask Prompt implementation; defaults to the terminal line prompt.
 * @returns The explicitly selected format or current by default.
 * @example await selectManifestFormat(undefined, false) // "current"
 */
export async function selectManifestFormat(
  value: string | undefined,
  interactive: boolean,
  ask: typeof promptLine = promptLine,
): Promise<ManifestFormat> {
  const selected = value ??
    (interactive
      ? await ask({
        message: "Event format: current or legacy",
        defaultValue: "current",
        suggestions: ["current", "legacy"],
      })
      : "current");
  if (selected !== "current" && selected !== "legacy") {
    throw new Error("--format must be current or legacy");
  }
  return selected;
}
