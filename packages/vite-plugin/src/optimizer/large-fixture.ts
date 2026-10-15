/**
 * Runtime-only end-to-end fixture for the large-asset optimizer.
 *
 * The fixture deliberately generates its bytes in memory and writes them only
 * into a temporary Vite project and its real output directory. Its Nostr, Blossom, and
 * NAP-RESOURCE boundaries are local fakes that still exercise the production
 * signature, discovery, upload, manifest, and recovery paths.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { build as viteBuild } from 'vite';
import { nip5aManifest } from '../index.js';
import { ResourceRuntime, type ResourceTableEntry } from './loader.js';
import { executeFinalArtifact } from './large-fixture-runtime.js';
import {
  createFixtureBuildServices,
  createFixtureNodeOptions,
  PRIMARY_SERVER,
  proveSecondaryFailure,
  SECONDARY_SERVER,
  type FixtureBuildServices,
  type FixtureRelay,
  type FixtureUploadEvidence,
} from './large-fixture-services.js';
import { OPTIMIZATION_TARGET_BYTES } from './pipeline.js';
import type { OptimizationReport } from './pipeline.js';

/** Every selected whole Blob stays within the generated loader's portable bound. */
export const MAX_FIXTURE_ASSET_BYTES = 10 * 1024 * 1024;
const MEBIBYTE = 1024 * 1024;

export interface LargeFixtureAsset {
  source: string;
  bytes: Uint8Array;
  mime: string;
}

export interface LargeAssetFixture {
  assets: LargeFixtureAsset[];
  totalCandidateBytes: number;
}

export type { FixtureUploadEvidence } from './large-fixture-services.js';

export interface LargeFixtureEvidence {
  initialHtmlBytes: number;
  finalHtmlBytes: number;
  selected: Array<{ source: string; bytes: number }>;
  uploads: FixtureUploadEvidence[];
  recovery: Array<{ source: string; sha256: string; exact: boolean }>;
  artifactHash: string;
  finalIndexHash: string;
  manifestTags: string[][];
  privateMappingCount: number;
  removedCandidateSources: string[];
  preservedCandidateSources: string[];
  discovery: { directoryRelays: string[]; writeRelays: string[]; servers: string[]; ignoredForgedEvent: boolean; ignoredOlderEvent: boolean };
  secondaryUploadFailed: boolean;
  corruptResourceRecovered: boolean;
  executedResourceCalls: string[];
}

export interface FallbackEvidence {
  wholeBlobPreserved: boolean;
  reason: string;
  resourceRequirementPresent: boolean;
}

interface BuiltFixture {
  dist: string;
  initialHtmlBytes: number;
  relay: FixtureRelay;
  signer: FixtureBuildServices['signer'];
  uploaded: Map<string, Uint8Array>;
  uploadEvidence: FixtureUploadEvidence[];
}

interface FixtureOutput {
  finalHtml: string;
  manifest: { artifactHash: string; tags: string[][] };
  entries: ResourceTableEntry[];
  selected: Array<{ source: string; bytes: number; sha256: string }>;
}

function sha256(bytes: Uint8Array): string {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

/** Generate seven deterministic candidate assets without checking binary data into git. */
export function buildLargeAssetFixture(): LargeAssetFixture {
  const sizes = [9, 9, 8, 8, 8, 7, 6].map((value) => value * MEBIBYTE);
  const assets = sizes.map((size, index) => ({
    source: `assets/fixture-${String(index + 1).padStart(2, '0')}.bin`,
    bytes: Buffer.alloc(size, index + 17),
    mime: 'application/octet-stream',
  }));
  return { assets, totalCandidateBytes: assets.reduce((total, asset) => total + asset.bytes.byteLength, 0) };
}

function writeFixture(root: string, fixture: LargeAssetFixture): string {
  const dist = path.join(root, 'dist');
  fs.mkdirSync(path.join(root, 'public', 'assets'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  const references = fixture.assets.map((asset) => `fetch(__nappletAssetUrl("${asset.source}"));`).join('\n');
  fs.writeFileSync(path.join(root, 'index.html'), '<!doctype html><html><head></head><body><script type="module" src="/src/main.js"></script></body></html>');
  fs.writeFileSync(path.join(root, 'src', 'main.js'), references);
  for (const asset of fixture.assets) fs.writeFileSync(path.join(root, 'public', asset.source), asset.bytes);
  return dist;
}

function extractPrivateTable(html: string): ResourceTableEntry[] {
  const match = /<script type="application\/json" data-napplet-private-resource-table>([\s\S]*?)<\/script>/.exec(html);
  if (!match) throw new Error('fixture final HTML does not contain the private resource table');
  return JSON.parse(match[1]!) as ResourceTableEntry[];
}

async function buildFixtureArtifact(root: string, fixture: LargeAssetFixture): Promise<BuiltFixture> {
  const dist = writeFixture(root, fixture);
  const uploadEvidence: FixtureUploadEvidence[] = [];
  const services = createFixtureBuildServices(uploadEvidence, sha256);
  let report: OptimizationReport | undefined;
  const options = {
    nappletType: 'large-fixture',
    description: 'Large packaged resource fixture',
    artifactMode: 'single-file' as const,
    requires: ['relay'],
    largeAssetOptimization: {
      node: createFixtureNodeOptions(services.signer, services.relay.services, services.fetch),
      onReport: (value: OptimizationReport) => { report = value; },
    },
  };
  await viteBuild({ root, logLevel: 'silent', plugins: [nip5aManifest(options)], build: { outDir: 'dist', emptyOutDir: true } });
  const initialHtmlBytes = report?.initialBytes;
  if (initialHtmlBytes === undefined) throw new Error('fixture did not record the production initial rendered size');
  return {
    dist,
    initialHtmlBytes,
    signer: services.signer,
    relay: services.relay,
    uploaded: services.uploaded,
    uploadEvidence,
  };
}

function readFixtureOutput(built: BuiltFixture, fixture: LargeAssetFixture): FixtureOutput {
  const finalHtml = fs.readFileSync(path.join(built.dist, 'index.html'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(built.dist, '.nip5a-manifest.json'), 'utf8')) as FixtureOutput['manifest'];
  const entries = extractPrivateTable(finalHtml);
  const selected = entries.map((entry) => ({ source: entry.source, bytes: entry.bytes, sha256: entry.sha256 }));
  const sourceByDigest = new Map(fixture.assets.map((asset) => [sha256(asset.bytes), asset.source]));
  for (const evidence of built.uploadEvidence) evidence.source = sourceByDigest.get(evidence.sha256) ?? '';
  return { finalHtml, manifest, entries, selected };
}

async function recoverFixtureResources(
  entries: ResourceTableEntry[],
  selected: FixtureOutput['selected'],
  uploaded: Map<string, Uint8Array>,
): Promise<Array<{ source: string; sha256: string; exact: boolean }>> {
  const byteCalls: string[][] = [];
  const runtime = new ResourceRuntime({
    entries,
    maxLiveBytes: 50 * MEBIBYTE,
    window: { napplet: { resource: {
      bytes: async () => { throw new Error('single bytes path is not the batch fixture proof'); },
      bytesMany: async (urls: string[]) => {
        byteCalls.push([...urls]);
        return urls.map((url) => ({ url, ok: true, blob: new Blob([uploaded.get(url)!]) }));
      },
    } } } as never,
    digest: async (blob) => sha256(new Uint8Array(await blob.arrayBuffer())),
  });
  const recovery: Array<{ source: string; sha256: string; exact: boolean }> = [];
  for (const sources of [selected.slice(0, 5), selected.slice(5)].filter((group) => group.length > 0)) {
    const blobs = await runtime.resolveMany(sources.map((entry) => entry.source));
    for (let index = 0; index < sources.length; index += 1) {
      const digest = sha256(new Uint8Array(await blobs[index]!.arrayBuffer()));
      recovery.push({ source: sources[index]!.source, sha256: digest, exact: digest === sources[index]!.sha256 });
      runtime.release(sources[index]!.source);
    }
  }
  runtime.teardown();
  if (byteCalls.length === 0 || byteCalls.some((requests) => requests.length === 0 || requests.some((url) => typeof url !== 'string'))) {
    throw new Error('fixture did not use exact URL-only NAP-RESOURCE bytesMany requests');
  }
  return recovery;
}

async function collectFixtureEvidence(
  built: BuiltFixture,
  fixture: LargeAssetFixture,
): Promise<LargeFixtureEvidence> {
  const output = readFixtureOutput(built, fixture);
  const recovery = await recoverFixtureResources(output.entries, output.selected, built.uploaded);
  const executedResourceCalls = await executeFinalArtifact(output.finalHtml, output.entries, built.uploaded, sha256);
  const finalIndexHash = sha256(fs.readFileSync(path.join(built.dist, 'index.html')));
  if (output.manifest.artifactHash !== finalIndexHash) throw new Error('fixture artifact hash does not match final output');
  return {
    initialHtmlBytes: built.initialHtmlBytes,
    finalHtmlBytes: Buffer.byteLength(output.finalHtml),
    selected: output.selected,
    uploads: built.uploadEvidence,
    recovery,
    artifactHash: output.manifest.artifactHash,
    finalIndexHash,
    manifestTags: output.manifest.tags,
    privateMappingCount: output.entries.length,
    removedCandidateSources: fixture.assets.filter((asset) => !fs.existsSync(path.join(built.dist, asset.source))).map((asset) => asset.source),
    preservedCandidateSources: fixture.assets.filter((asset) => fs.existsSync(path.join(built.dist, asset.source))).map((asset) => asset.source),
    discovery: {
      directoryRelays: built.relay.queries[0]?.relays ?? [],
      writeRelays: built.relay.queries[1]?.relays ?? [],
      servers: [PRIMARY_SERVER, SECONDARY_SERVER],
      ignoredForgedEvent: built.relay.ignoredForgedEvent,
      ignoredOlderEvent: built.relay.ignoredOlderEvent,
    },
    secondaryUploadFailed: await proveSecondaryFailure(built.signer),
    corruptResourceRecovered: await corruptResourceRecovers(output.entries[0]!, built.uploaded.get(output.entries[0]!.uri)!),
    executedResourceCalls,
  };
}

/** Run actual manifest orchestration and execute the rewritten final artifact against exact-byte local fakes. */
export async function runLargeAssetFixture(fixture: LargeAssetFixture): Promise<LargeFixtureEvidence> {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'napplet-large-fixture-'));
  try {
    return await collectFixtureEvidence(await buildFixtureArtifact(root, fixture), fixture);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function corruptResourceRecovers(entry: ResourceTableEntry, expected: Uint8Array): Promise<boolean> {
  let attempts = 0;
  let failureSeen!: () => void;
  const failed = new Promise<void>((resolve) => { failureSeen = resolve; });
  const runtime = new ResourceRuntime({
    entries: [entry],
    window: { napplet: { resource: {
      bytes: async () => {
        attempts += 1;
        return new Blob([attempts === 1 ? new Uint8Array(entry.bytes) : expected]);
      },
      bytesMany: async () => [],
    } } } as never,
    digest: async (blob) => sha256(new Uint8Array(await blob.arrayBuffer())),
    onState: (state) => {
      if (state.phase === 'error') failureSeen();
    },
  });
  const original = runtime.resolve(entry.source);
  let settled = false;
  void original.then(
    () => { settled = true; },
    () => { settled = true; },
  );
  await failed;
  if (settled) return false;
  await runtime.retry();
  const recovered = new Uint8Array(await (await original).arrayBuffer());
  runtime.teardown();
  return attempts === 2 && sha256(recovered) === entry.sha256;
}

/** Prove a whole Blob beyond the implementation limit remains a nonfatal inline fallback. */
export async function runWholeBlobPortabilityFallback(): Promise<FallbackEvidence> {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'napplet-whole-blob-boundary-'));
  try {
    const dist = path.join(root, 'dist');
    fs.mkdirSync(path.join(root, 'public', 'assets'), { recursive: true });
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    const overLimit = Buffer.alloc(MAX_FIXTURE_ASSET_BYTES + 1, 91);
    fs.writeFileSync(path.join(root, 'index.html'), '<html><head></head><body><script type="module" src="/src/main.js"></script></body></html>');
    fs.writeFileSync(path.join(root, 'src', 'main.js'), 'fetch(__nappletAssetUrl("assets/oversized.bin"));');
    fs.writeFileSync(path.join(root, 'public', 'assets', 'oversized.bin'), overLimit);
    let report: OptimizationReport | undefined;
    const options = {
      nappletType: 'whole-blob-boundary',
      description: 'Whole Blob portability fixture',
      artifactMode: 'single-file' as const,
      requires: ['relay'],
      largeAssetOptimization: {
        onReport: (value: OptimizationReport) => { report = value; },
      },
    };
    await viteBuild({ root, logLevel: 'silent', plugins: [nip5aManifest(options)], build: { outDir: 'dist', emptyOutDir: true } });
    if (report?.status !== 'target-not-reached' || report.selected.length !== 0) throw new Error('whole Blob portability boundary did not remain ineligible');
    const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
    const manifest = JSON.parse(fs.readFileSync(path.join(dist, '.nip5a-manifest.json'), 'utf8')) as { tags: string[][] };
    return {
      wholeBlobPreserved: html.includes('data:application/octet-stream;base64,'),
      reason: 'whole-Blob portability limit; streaming and ranges are not provided',
      resourceRequirementPresent: manifest.tags.some((tag) => tag[0] === 'R' && tag[1] === 'resource'),
    };
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

export const FIXTURE_TARGET_BYTES = OPTIMIZATION_TARGET_BYTES;
