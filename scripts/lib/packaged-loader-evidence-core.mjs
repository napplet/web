import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  exactKeys,
  fail,
  hash,
  safeFile,
  scanSecret,
  sha256,
  string,
} from './packaged-loader-evidence-shared.mjs';
import {
  parseTraceZip,
  secretVariants,
  validateScreenshots,
} from './packaged-loader-evidence-local.mjs';
import {
  validateSessions,
  validateTimelineShape,
} from './packaged-loader-evidence-timeline.mjs';
import {
  validateManifestAndBytes,
  validatePublication,
} from './packaged-loader-evidence-remote.mjs';

/** Compute the canonical NIP-5A aggregate over sorted hash/path lines. */
export function computeAggregateHash(paths) {
  if (!Array.isArray(paths) || paths.length === 0) {
    fail('manifest paths must be a non-empty array');
  }
  const lines = paths.map((entry, index) => {
    exactKeys(entry, ['path', 'sha256'], `manifest.paths[${index}]`);
    const file = string(entry.path, `manifest.paths[${index}].path`);
    if (!file.startsWith('/') || file.endsWith('/')) {
      fail(`manifest.paths[${index}].path must be an absolute file path`);
    }
    return `${hash(entry.sha256, `manifest.paths[${index}].sha256`)} ${file}\n`;
  });
  return sha256(Buffer.from(lines.sort().join(''), 'utf8'));
}

/** Validate retained loader evidence against local binaries and refetched public bytes. */
export async function validateEvidence({
  evidenceDir: inputDirectory,
  secretFile,
  services,
  publication,
}) {
  const evidenceDir = path.resolve(inputDirectory);
  const timelinePath = path.join(evidenceDir, 'paja-loader-timeline.json');

  let timelineBytes;
  let timeline;
  try {
    timelineBytes = fs.readFileSync(timelinePath);
    timeline = JSON.parse(timelineBytes.toString('utf8'));
  } catch {
    fail('timeline is missing or invalid JSON');
  }

  validateTimelineShape(timeline);
  const activeDurationMs = validateSessions(timeline);
  validateScreenshots(timeline, evidenceDir);

  const tracePath = safeFile(evidenceDir, timeline.trace.file, 'trace.file');
  const traceBytes = fs.readFileSync(tracePath);
  if (sha256(traceBytes) !== timeline.trace.sha256) {
    fail('trace full-file hash does not match');
  }
  const traceEntries = parseTraceZip(traceBytes);

  await validateManifestAndBytes(timeline, services, computeAggregateHash);

  let secretText;
  try {
    secretText = fs.readFileSync(secretFile, 'utf8');
  } catch {
    fail('secret file is unavailable');
  }
  const variants = secretVariants(secretText);
  for (const filename of fs.readdirSync(evidenceDir)) {
    const filePath = path.join(evidenceDir, filename);
    scanSecret(fs.readFileSync(filePath), variants, `evidence file ${filename}`);
  }
  for (const [name, value] of traceEntries) {
    scanSecret(value, variants, `trace entry ${name}`);
  }

  const baseResult = {
    screenshots: timeline.screenshots.length,
    resources: timeline.resources.length,
    activeDurationMs,
    publication: Boolean(publication),
  };
  if (!publication) return baseResult;

  const publicationResult = await validatePublication(
    publication,
    services,
    variants,
  );
  return { ...baseResult, ...publicationResult };
}

/** Parse the retained-validator CLI contract. */
export function parseCliArgs(argv) {
  const values = [...argv];
  const evidenceDir = values.shift();
  if (!evidenceDir || evidenceDir.startsWith('-')) {
    throw new Error(
      'usage: validate-packaged-loader-evidence <evidence-dir> --secret-file <path> [--publication --repo <owner/name> --head <branch> --base <branch> --review <path> --verification <path>]',
    );
  }

  const parsed = {};
  let publication = false;
  while (values.length > 0) {
    const flag = values.shift();
    if (flag === '--publication') {
      if (publication) throw new Error('duplicate --publication');
      publication = true;
      continue;
    }
    if (
      ![
        '--secret-file',
        '--repo',
        '--head',
        '--base',
        '--review',
        '--verification',
      ].includes(flag)
    ) {
      throw new Error(`unknown option: ${flag}`);
    }

    const value = values.shift();
    if (!value || value.startsWith('-')) {
      throw new Error(`missing value for ${flag}`);
    }
    const key = flag
      .slice(2)
      .replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
    if (key in parsed) throw new Error(`duplicate option: ${flag}`);
    parsed[key] = value;
  }

  if (!parsed.secretFile) throw new Error('--secret-file is required');
  if (!publication) {
    return { evidenceDir, secretFile: parsed.secretFile };
  }

  const required = ['repo', 'head', 'base', 'review', 'verification'];
  if (required.some((key) => !parsed[key])) {
    throw new Error(
      'publication mode requires --repo, --head, --base, --review, and --verification',
    );
  }

  return {
    evidenceDir,
    secretFile: parsed.secretFile,
    publication: {
      repo: parsed.repo,
      head: parsed.head,
      base: parsed.base,
      reviewPath: parsed.review,
      verificationPath: parsed.verification,
    },
  };
}
