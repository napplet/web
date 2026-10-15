/** Deployment command orchestration after interactive configuration preflight. */
import { createSigningDebugInfo } from "./debug.ts";
import { createDeployPlan } from "./deploy-plan.ts";
import { completeDeployInputs } from "./deploy-config.ts";
import { createDeploySigner } from "./deploy-signer.ts";
import { executeNetworkDeploy, networkDeploySucceeded, resolveDeployServers } from "./deploy-network.ts";
import { collectFlags, first } from "./flags.ts";
import { selectManifestFormat } from "./manifest-format.ts";
import { createDeployManifestTemplates } from "./manifest.ts";
import { createDeployProgressReporter, isTerminalOutput, renderDeployReport } from "./output.ts";
import { canPrompt } from "./interaction.ts";
import { resolveSigningMethod, signDeployManifestTemplates } from "./signing.ts";
import type { DeploySelection } from "./types.ts";
import { linkZapstoreApplication, prepareZapstorePublication } from "./zapstore.ts";
import { captureDeployScreenshot } from "./deploy-screenshot.ts";
import { loadDeployConfig } from "./config-command.ts";
import type { PackageCliRunner } from "./cli.ts";
import { choose, promptRequired } from "./command-prompts.ts";
import { paint } from "./terminal.ts";
import { saveDeploySigner } from "./editable-config.ts";

/**
 * Complete configuration, sign artifacts, and report deployment results.
 * @param argv Deployment flags.
 * @param runScreenshot Optional maintained screenshot runner.
 * @returns Zero for a successful deployment or preview, one for network failure.
 * @example await commandDeploy(["--dry-run", "-i"])
 */
export async function commandDeploy(argv: string[], runScreenshot?: PackageCliRunner): Promise<number> {
  const { flags, jsonOutput, config, format, descriptions, signing, plan, dryRun } = await prepareDeploy(argv);
  const { signer, signing: deploySigning } = await createDeploySigner(signing, config, {
    sec: first(flags.values.get("sec")),
    required: !dryRun,
    interactiveConnect: !dryRun && canPrompt() && !jsonOutput,
    isTerminalInput: canPrompt,
    configPath: first(flags.values.get("config")),
    writeConfig: saveDeploySigner,
    print: (line) => console.error(line),
    writePromptBytes: (bytes) => Deno.stderr.writeSync(bytes),
  });
  let screenshot: Awaited<ReturnType<typeof captureDeployScreenshot>>;
  try {
    const signingInfo = createSigningDebugInfo(deploySigning);
    let templates = await createDeployManifestTemplates(plan, config, {
      sourcePubkey: signer?.pubkey,
      format,
      descriptions,
    });
    const blossomServers = resolveDeployServers(templates, config.blossomServers);
    screenshot = await captureDeployScreenshot(flags, config, runScreenshot, plan);
    const publicationConfig = screenshot && config.zapstore
      ? { ...config, zapstore: { ...config.zapstore, images: [...(config.zapstore.images ?? []), ...screenshot.paths] } }
      : config;
    const application = await prepareZapstorePublication(publicationConfig, blossomServers, {
      enabled: flags.boolean.has("no-zapstore") ? false : flags.boolean.has("zapstore") ? true : undefined,
    });
    if (application && signer) {
      application.signedEvent = await signer.sign(application.template);
      templates = linkZapstoreApplication(templates, application.signedEvent, config.relays);
    } else if (application && format === "current") {
      console.error("Application link omitted from unsigned dry run: a signer public key is required.");
    }
    const manifests = signer ? await signDeployManifestTemplates(templates, signer) : templates;
    let deploy;
    if (!dryRun) {
      if (!signer) {
        throw new Error("Network deploy requires a signer from --sec, --prompt-sec, config, or CI");
      }
      deploy = await executeNetworkDeploy(
        manifests,
        {
          relays: config.relays,
          blossomServers,
        },
        signer,
        {
          onProgress: jsonOutput ? undefined : createDeployProgressReporter({ servers: blossomServers }),
          application,
        },
      );
    }
    const report = {
      signing: signingInfo,
      plan,
      manifests,
      application,
      deploy,
      relays: config.relays,
      blossomServers,
      dryRun,
    };
    console.log(jsonOutput ? JSON.stringify(report, (_key, value) => value instanceof Uint8Array ? undefined : value, 2) : renderDeployReport(report));
    return deploy && !networkDeploySucceeded(deploy, manifests) ? 1 : 0;
  } finally {
    try { await screenshot?.cleanup(); } finally { await signer?.close?.(); }
  }
}


async function prepareDeploy(argv: string[]) {
  const flags = collectFlags(argv);
  if (flags.boolean.has("zapstore") && flags.boolean.has("no-zapstore")) {
    throw new Error("Choose either --zapstore or --no-zapstore");
  }
  const jsonOutput = flags.boolean.has("json") || !isTerminalOutput();
  const loaded = await loadDeployConfig(flags, jsonOutput);
  const format = await selectManifestFormat(first(flags.values.get("format")), canPrompt() && !jsonOutput);
  const { config, candidates, descriptions } = await completeDeployInputs(loaded, flags, format);
  const selection: Partial<DeploySelection> = {
    root: flags.boolean.has("root") ? true : undefined,
    names: flags.values.get("name"),
    snapshot: flags.boolean.has("snapshot") ? true : undefined,
  };
  let signing = resolveSigningMethod(config, {
    sec: first(flags.values.get("sec")),
    promptSec: flags.boolean.has("prompt-sec"),
  });
  const plan = createDeployPlan(config, candidates, selection, {
    configPath: first(flags.values.get("config")),
    traverse: flags.boolean.has("all"),
  });
  if (!plan.items.length) throw new Error("No deployment targets matched. Check --name filters and the discovered build directories.");

  const dryRun = flags.boolean.has("dry-run");
  if (!jsonOutput) {
    console.error(paint("\nDeployment plan", "heading"));
    for (const item of plan.items) console.error(`  ${config.metadata?.title ?? item.dTag ?? item.candidate.name}  /  ${item.target}${item.dTag ? `:${item.dTag}` : ""}`);
    console.error(`  Relays: ${config.relays.join(", ") || "none (preview)"}`);
    console.error(`  Blossom: ${config.blossomServers.join(", ") || "artifact hints / preview"}`);
    console.error(paint(dryRun ? "  Dry run: no uploads or publications.\n" : "  Preparing signer and artifacts...\n", "muted"));
  }
  if (!dryRun && canPrompt() && signing.type === "none") {
    const method = await choose("Choose how to sign this deployment", {
      connect: "Connect a remote signer using a QR code",
      paste: "Enter an nsec, hex key, or bunker secret (hidden; used once)",
      stored: "Use a key reference already saved on this machine",
    }, "connect");
    if (method === "paste") signing = { type: "prompt", source: "prompt-sec" };
    if (method === "stored") signing = { type: "stored", source: "config", keyReference: await promptRequired({ message: "Stored key reference" }) };
  }
  return { flags, jsonOutput, config, format, descriptions, signing, plan, dryRun };
}
