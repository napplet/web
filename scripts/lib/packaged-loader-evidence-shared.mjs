import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const SHA256 = /^[a-f0-9]{64}$/;
export const GIT_SHA = /^[a-f0-9]{40}$/;
export const SCREENSHOT_STATES = ['initial', 'active-35s', 'partial', 'error', 'ready', 'cancelled', 'light', 'dark', 'reduced-motion', 'keyboard-retry'];
export const SESSION_NAMES = ['packaged-loader-long', 'packaged-loader-retry', 'packaged-loader-cancel', 'packaged-loader-a11y'];
export const ROOT_KEYS = ['browser', 'manifest', 'resources', 'schemaVersion', 'screenshots', 'sessions', 'trace'];
export const MAX_TRACE_ENTRY_BYTES = 100 * 1024 * 1024;
export const MAX_TRACE_TOTAL_BYTES = 250 * 1024 * 1024;

export function fail(message) {
  throw new Error(`packaged loader evidence is invalid: ${message}`);
}

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  return value;
}

export function exactKeys(value, expected, label) {
  const actual = Object.keys(object(value, label)).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    fail(`${label} has unknown or missing fields`);
  }
}

export function string(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    fail(`${label} must be a non-empty string`);
  }
  return value;
}

export function integer(value, label) {
  if (!Number.isSafeInteger(value)) {
    fail(`${label} must be a safe integer`);
  }
  return value;
}

export function hash(value, label) {
  if (typeof value !== 'string' || !SHA256.test(value)) {
    fail(`${label} must be lowercase SHA-256`);
  }
  return value;
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function sameStrings(left, right) {
  const first = [...left].sort();
  const second = [...right].sort();
  return (
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
}

export function safeFile(root, filename, label) {
  string(filename, label);
  if (
    path.isAbsolute(filename) ||
    filename.includes('\\') ||
    filename.split('/').includes('..')
  ) {
    fail(`${label} is unsafe`);
  }
  const resolved = path.resolve(root, filename);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    fail(`${label} escapes the evidence directory`);
  }
  return resolved;
}

export function scanSecret(value, variants, label) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  if (variants.some((variant) => buffer.includes(Buffer.from(variant)))) {
    fail(`secret material found in ${label}`);
  }
}

export function readMetadata(file, label) {
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    fail(`${label} is missing`);
  }
  function value(key) {
    return new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm').exec(content)?.[1];
  }
  return { content, value };
}

export function canonicalEndpoint(servers, digest, endpoint) {
  return servers.some(
    (server) => `${server.replace(/\/+$/, '')}/${digest}` === endpoint,
  );
}
