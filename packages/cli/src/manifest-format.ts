/** CLI event-format selection. Only the current NIP-5D manifest schema is written. */
export type ManifestFormat = "current";

/**
 * Validate the `--format` flag. Omitted or `current` selects the current NIP-5D schema; the
 * retired `legacy` path/aggregate output is rejected with a pointer to its replacements.
 * @param value Explicit --format value, when supplied.
 * @returns The current format.
 * @example selectManifestFormat(undefined) // "current"
 */
export function selectManifestFormat(value: string | undefined): ManifestFormat {
  if (value === undefined || value === "current") return "current";
  if (value === "legacy") {
    throw new Error(
      "--format legacy was retired: NIP-5D manifests carry one x tag for a single self-contained /index.html. Build a single-file artifact (the @napplet/vite-plugin default) and deploy with --format current, or run napplet migrate <event.json> to convert an old legacy event.",
    );
  }
  throw new Error("--format must be current");
}
