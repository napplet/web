/** CLI-only format selection; current libraries never infer legacy fallback. */
import { promptLine } from "./prompt.ts";
export type ManifestFormat = "current" | "legacy";

/** Select the deployment format, prompting only for interactive deployments. */
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
