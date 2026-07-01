import type { NappletConfig, SigningMethod } from "./types.ts";

export function detectSecretFormat(
  secret: string,
): "nsec" | "nbunksec" | "bunker-url" | "hex" | null {
  const trimmed = secret.trim();
  if (trimmed.startsWith("nbunksec1")) return "nbunksec";
  if (trimmed.startsWith("nsec1")) return "nsec";
  if (trimmed.startsWith("bunker://")) return "bunker-url";
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return "hex";
  return null;
}

export function resolveSigningMethod(
  config: NappletConfig,
  options: { sec?: string; promptSec?: boolean; env?: Record<string, string | undefined> } = {},
): SigningMethod {
  if (options.sec) {
    const format = detectSecretFormat(options.sec);
    if (!format) {
      throw new Error("Invalid --sec. Expected nsec, nbunksec, bunker:// URL, or 64-char hex.");
    }
    if (format === "nsec" || format === "hex") {
      return { type: "private-key", source: "sec-flag", format };
    }
    return { type: "bunker", source: "sec-flag", format };
  }

  if (options.promptSec) {
    return { type: "prompt", source: "prompt-sec" };
  }

  const env = options.env ?? Deno.env.toObject();
  const ciReference = env.NAPPLET_CI_SIGNING_KEY ?? env.NAPPLET_CI_KEY_REFERENCE;
  if (config.signing?.mode === "ci" && ciReference) {
    return { type: "ci-revocable", source: "environment", keyReference: ciReference };
  }

  if (config.signing?.keyReference) {
    return { type: "stored", source: "config", keyReference: config.signing.keyReference };
  }

  return { type: "none" };
}
