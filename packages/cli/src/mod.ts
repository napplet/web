/**
 * Deno-first CLI and reusable helpers for deploying built napplets.
 *
 * Use `@napplet/cli/cli` when you want the `napplet` executable:
 *
 * ```sh
 * deno install --global \
 *   --allow-read --allow-write --allow-run --allow-env --allow-net \
 *   --name napplet \
 *   jsr:@napplet/cli/cli
 *
 * napplet init --relay wss://relay.example --server https://blossom.example --name feed
 * napplet debug
 * napplet deploy --dry-run --sec nsec1...
 * ```
 *
 * Use the root `@napplet/cli` entrypoint when another tool needs the same
 * building blocks as the command implementation:
 *
 * - read and write `.napplet/config.json`
 * - discover deployable `index.html` artifacts
 * - create root, named, and snapshot deploy plans
 * - extract title, description, hash, and file metadata from built artifacts
 * - resolve local, CI, stored, or remote signing methods
 * - sign deploy manifest templates before network upload/publish code runs
 *
 * The CLI can upload files to configured Blossom servers and publish signed
 * manifest events to configured relays. `napplet deploy --dry-run` exercises the
 * same config, discovery, manifest, and signing path without network writes.
 *
 * @example
 * ```ts
 * import {
 *   createDeployPlan,
 *   createDeployManifestTemplates,
 *   discoverNapplets,
 *   readConfig,
 * } from "@napplet/cli";
 *
 * const config = await readConfig();
 * if (!config) throw new Error("Run napplet init first");
 *
 * const candidates = await discoverNapplets(config);
 * const plan = createDeployPlan(config, candidates, {});
 * const manifests = await createDeployManifestTemplates(plan, config);
 * console.log(manifests.map((m) => m.item.dTag ?? "root"));
 * ```
 *
 * @packageDocumentation
 */

export * from "./config.ts";
export * from "./deploy-plan.ts";
export * from "./discover.ts";
export * from "./key-store.ts";
export * from "./manifest.ts";
export * from "./process.ts";
export * from "./signing.ts";
export * from "./types.ts";
