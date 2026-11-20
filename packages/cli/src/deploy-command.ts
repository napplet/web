/** Deployment command orchestration after interactive configuration preflight. */
import { createSigningDebugInfo } from "./debug.ts";
import { createDeployPlan } from "./deploy-plan.ts";
import { completeDeployInputs } from "./deploy-config.ts";
import { createDeploySigner } from "./deploy-signer.ts";
import { executeNetworkDeploy, networkDeploySucceeded, resolveDeployServers } from "./deploy-network.ts";
import { collectFlags, first } from "./flags.ts";
import { selectManifestFormat } from "./manifest-format.ts";
import { createDeployManifestTemplates } from "./manifest.ts";
import { createDeployProgressReporter, type DeployReport, isTerminalOutput, renderDeployReport } from "./output.ts";
import { canPrompt } from "./interaction.ts";
import { activeProxy } from "./network.ts";
import { resolveSigningMethod, signDeployManifestTemplates } from "./signing.ts";
import type { DeploySelection } from "./types.ts";
import { inferZapstoreConfig, prepareZapstorePublication } from "./zapstore.ts";
import { attachCapturedScreenshots, captureDeployScreenshot } from "./deploy-screenshot.ts";
import { loadDeployConfig } from "./config-command.ts";
import type { PackageCliRunner } from "./cli.ts";
import { choose, confirm, promptRequired } from "./command-prompts.ts";
import { paint } from "./terminal.ts";
import { saveDeploySigner } from "./editable-config.ts";
import { findNappletProjects, hasNappletConfig } from "./discover.ts";
import { relativePath } from "./path.ts";

/**
 * Complete configuration, sign artifacts, and report deployment results.
 * Without a `.napplet` config here, `--all` deploys each napplet project found below; an interactive
 * terminal is asked (default no) whether to search before falling back to guided setup.
 * @param argv Deployment flags.
 * @param runScreenshot Optional maintained screenshot runner.
 * @param options Prompt seams for the no-config search question.
 * @returns Zero for a successful deployment or preview, one for network failure.
 * @example await commandDeploy(["--dry-run", "-i"])
 */
export async function commandDeploy(
  argv: string[],
  runScreenshot?: PackageCliRunner,
  options: DeployRoutingOptions = {},
): Promise<number> {
  const flags = collectFlags(argv);
  if (!flags.values.has("config") && !await hasNappletConfig()) {
    if (flags.boolean.has("all")) return await commandDeployProjects(argv, runScreenshot, options.deployProject);
    const interactive = options.interactive ??
      (!flags.boolean.has("json") && isTerminalOutput() && !flags.boolean.has("non-interactive") && canPrompt());
    const search = interactive && await (options.confirmSearch ?? confirm)(
      "No napplet config in this directory. Search subdirectories for napplets?",
      false,
    );
    if (search && (await findNappletProjects()).length) {
      return await commandDeployProjects([...argv, "--all"], runScreenshot, options.deployProject);
    }
    if (search) console.error("No napplets with their own .napplet config were found in subdirectories.");
  }
  const { code, report, jsonOutput } = await runDeploy(argv, runScreenshot);
  console.log(jsonOutput ? renderJson(report) : renderDeployReport(report));
  return code;
}

/** Test seams for the no-config routing in `commandDeploy`. */
export interface DeployRoutingOptions {
  /** Whether the search question may be asked; defaults to the terminal policy. */
  interactive?: boolean;
  confirmSearch?: typeof confirm;
  /** Deployment of one project, used when searching subdirectories. */
  deployProject?: typeof runDeploy;
}

/**
 * Deploy every napplet project below the current directory, each from its own directory and configuration.
 * `--name` selects projects by folder name or relative path; the remaining flags apply to every project.
 * @param argv Deployment flags, including `--all`.
 * @param runScreenshot Optional maintained screenshot runner.
 * @param deployOne Deployment of the project in the current directory, replaceable in tests.
 * @returns Zero when every selected project deployed, one when any failed.
 * @example await commandDeployProjects(["--all", "--dry-run", "--sec", "nsec1..."])
 */
export async function commandDeployProjects(
  argv: string[],
  runScreenshot?: PackageCliRunner,
  deployOne: typeof runDeploy = runDeploy,
): Promise<number> {
  const flags = collectFlags(argv);
  for (const flag of ["config", "source-dir"]) {
    if (flags.values.has(flag)) {
      throw new Error(`--${flag} cannot be combined with --all when this directory has no .napplet config; each napplet uses its own.`);
    }
  }
  const jsonOutput = flags.boolean.has("json") || !isTerminalOutput();
  const root = Deno.cwd();
  const names = flags.values.get("name");
  const found = await findNappletProjects(root);
  const projects = [];
  for (const project of found) {
    if (!names || names.includes(project.name) || names.includes(relativePath(root, project.dir))) {
      projects.push(project);
    }
  }
  if (!found.length) throw new Error(`No .napplet config found in ${root} or any subdirectory. Run: napplet init`);
  if (!projects.length) throw new Error(`No napplet project matched --name ${names?.join(", ")}. Found: ${found.map((p) => p.name).join(", ")}`);
  // Ask the event format once for the whole run instead of once per napplet.
  const format = await selectManifestFormat(first(flags.values.get("format")), canPrompt() && !jsonOutput && !flags.boolean.has("non-interactive"));
  const inner = [...withoutProjectSelection(argv), ...(flags.values.has("format") ? [] : ["--format", format])];
  const results: { project: string; configPath: string; code: number; report?: DeployReport; error?: string }[] = [];
  if (!jsonOutput) console.error(paint(`\nDeploying ${projects.length} napplet${projects.length === 1 ? "" : "s"}: ${projects.map((p) => relativePath(root, p.dir)).join(", ")}`, "heading"));
  for (const project of projects) {
    const label = relativePath(root, project.dir);
    if (!jsonOutput) console.error(paint(`\n── ${label} ──`, "heading"));
    Deno.chdir(project.dir);
    try {
      const { code, report } = await deployOne(inner, runScreenshot);
      results.push({ project: label, configPath: project.configPath, code, report });
      if (!jsonOutput) console.log(renderDeployReport(report));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ project: label, configPath: project.configPath, code: 1, error: message });
      if (!jsonOutput) console.error(paint(`${label}: ${message}`, "error"));
    } finally {
      Deno.chdir(root);
    }
  }
  const failed = results.filter((result) => result.code !== 0);
  const verb = flags.boolean.has("dry-run") ? "previewed" : "deployed";
  if (jsonOutput) console.log(renderJson(results));
  else console.error(paint(`\n${results.length - failed.length}/${results.length} napplets ${verb}${failed.length ? `; failed: ${failed.map((r) => r.project).join(", ")}` : ""}.`, failed.length ? "error" : "heading"));
  return failed.length ? 1 : 0;
}

// `--name` picks projects here; passing it through would override each project's own d tag.
function withoutProjectSelection(argv: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--") { out.push(...argv.slice(i)); break; }
    if (argv[i] === "--all") continue;
    if (argv[i] === "--name") { i++; continue; }
    out.push(argv[i]);
  }
  return out;
}

function renderJson(value: unknown): string {
  return JSON.stringify(value, (_key, item) => item instanceof Uint8Array ? undefined : item, 2);
}

/**
 * Deploy the napplet configured in the current directory without printing its report.
 * @param argv Deployment flags.
 * @param runScreenshot Optional maintained screenshot runner.
 * @returns Exit code, the deployment report, and whether JSON output was requested.
 * @example await runDeploy(["--dry-run", "-i"])
 */
export async function runDeploy(
  argv: string[],
  runScreenshot?: PackageCliRunner,
): Promise<{ code: number; report: DeployReport; jsonOutput: boolean }> {
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
    const templates = await createDeployManifestTemplates(plan, config, {
      sourcePubkey: signer?.pubkey,
      format,
      descriptions,
    });
    const blossomServers = resolveDeployServers(templates, config.blossomServers);
    const zapstoreEnabled = !flags.boolean.has("no-zapstore") &&
      (flags.boolean.has("zapstore") || config.zapstore?.enabled !== false);
    const applicationConfig = zapstoreEnabled
      ? { ...config, zapstore: config.zapstore ?? inferZapstoreConfig(config, templates) }
      : config;
    screenshot = await captureDeployScreenshot(flags, applicationConfig, runScreenshot, plan);
    await attachCapturedScreenshots(templates, screenshot, config);
    const publicationConfig = screenshot && applicationConfig.zapstore
      ? { ...applicationConfig, zapstore: { ...applicationConfig.zapstore, images: [...(applicationConfig.zapstore.images ?? []), ...screenshot.paths] } }
      : applicationConfig;
    const application = await prepareZapstorePublication(publicationConfig, blossomServers, {
      enabled: zapstoreEnabled,
    });
    if (application && signer) {
      application.signedEvent = await signer.sign(application.template);
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
    return { code: deploy && !networkDeploySucceeded(deploy, manifests) ? 1 : 0, report, jsonOutput };
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
    const proxy = activeProxy();
    if (proxy) console.error(`  Proxy: ${proxy}`);
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
