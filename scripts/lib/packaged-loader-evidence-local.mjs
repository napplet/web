import * as fs from 'node:fs';
import * as zlib from 'node:zlib';
import { nip19 } from 'nostr-tools';

import {
  MAX_TRACE_ENTRY_BYTES,
  MAX_TRACE_TOTAL_BYTES,
  SCREENSHOT_STATES,
  fail,
  safeFile,
  sameStrings,
  sha256,
} from './packaged-loader-evidence-shared.mjs';

function validatePng(value, screenshot) {
  if (
    value.length < 24 ||
    value.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'
  ) {
    fail(`screenshot ${screenshot.file} has an invalid PNG signature`);
  }
  if (
    value.readUInt32BE(8) !== 13 ||
    value.subarray(12, 16).toString('ascii') !== 'IHDR'
  ) {
    fail(`screenshot ${screenshot.file} has an invalid IHDR`);
  }
  const width = value.readUInt32BE(16);
  const height = value.readUInt32BE(20);
  if (
    width < 1 ||
    height < 1 ||
    width !== screenshot.width ||
    height !== screenshot.height
  ) {
    fail(`screenshot ${screenshot.file} dimensions do not match`);
  }
  if (sha256(value) !== screenshot.sha256) {
    fail(`screenshot ${screenshot.file} hash does not match`);
  }
}

function findEocd(value) {
  for (
    let index = value.length - 22;
    index >= Math.max(0, value.length - 65_557);
    index -= 1
  ) {
    if (value.readUInt32LE(index) === 0x06054b50) return index;
  }
  return -1;
}

function safeZipName(name) {
  return (
    name.length > 0 &&
    !name.includes('\\') &&
    !name.startsWith('/') &&
    !name.split('/').includes('..') &&
    !name.includes('\0')
  );
}

function readEndOfCentralDirectory(value, eocd) {
  const commentLength = value.readUInt16LE(eocd + 20);
  if (
    eocd + 22 + commentLength !== value.length ||
    value.readUInt16LE(eocd + 4) !== 0 ||
    value.readUInt16LE(eocd + 6) !== 0
  ) {
    fail('trace ZIP EOCD is invalid');
  }

  const diskEntries = value.readUInt16LE(eocd + 8);
  const entries = value.readUInt16LE(eocd + 10);
  const centralSize = value.readUInt32LE(eocd + 12);
  const centralOffset = value.readUInt32LE(eocd + 16);
  if (
    entries < 1 ||
    entries !== diskEntries ||
    centralOffset + centralSize !== eocd
  ) {
    fail('trace ZIP central directory bounds are invalid');
  }
  return { centralOffset, centralSize, entries, eocd };
}

function readCentralDirectoryEntry(value, cursor, centralOffset, eocd) {
  if (cursor + 46 > eocd || value.readUInt32LE(cursor) !== 0x02014b50) {
    fail('trace ZIP central directory is corrupt');
  }
  const flags = value.readUInt16LE(cursor + 8);
  const method = value.readUInt16LE(cursor + 10);
  const compressedSize = value.readUInt32LE(cursor + 20);
  const uncompressedSize = value.readUInt32LE(cursor + 24);
  const nameLength = value.readUInt16LE(cursor + 28);
  const extraLength = value.readUInt16LE(cursor + 30);
  const entryCommentLength = value.readUInt16LE(cursor + 32);
  const localOffset = value.readUInt32LE(cursor + 42);
  const end = cursor + 46 + nameLength + extraLength + entryCommentLength;
  if (end > eocd || (flags & 1) !== 0 || ![0, 8].includes(method)) {
    fail('trace ZIP entry metadata is invalid');
  }

  const name = value.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
  if (!safeZipName(name) || uncompressedSize > MAX_TRACE_ENTRY_BYTES) {
    fail('trace ZIP entry is unsafe');
  }
  if (
    localOffset + 30 > centralOffset ||
    value.readUInt32LE(localOffset) !== 0x04034b50
  ) {
    fail('trace ZIP local header is invalid');
  }

  return { compressedSize, end, localOffset, method, name, uncompressedSize };
}

function inflateTraceEntry(value, entry, centralOffset) {
  const localNameLength = value.readUInt16LE(entry.localOffset + 26);
  const localExtraLength = value.readUInt16LE(entry.localOffset + 28);
  const localName = value
    .subarray(entry.localOffset + 30, entry.localOffset + 30 + localNameLength)
    .toString('utf8');
  const dataOffset = entry.localOffset + 30 + localNameLength + localExtraLength;
  if (localName !== entry.name || dataOffset + entry.compressedSize > centralOffset) {
    fail('trace ZIP local entry does not match central directory');
  }

  const compressed = value.subarray(dataOffset, dataOffset + entry.compressedSize);
  try {
    return entry.method === 0
      ? Buffer.from(compressed)
      : zlib.inflateRawSync(compressed, {
          maxOutputLength: MAX_TRACE_ENTRY_BYTES,
        });
  } catch {
    fail('trace ZIP entry cannot be inflated');
  }
}

function validateTraceEntries(extracted) {
  const names = [...extracted.keys()];
  if (
    !names.some((name) => name.endsWith('trace.trace')) ||
    !names.some((name) => name.endsWith('trace.network'))
  ) {
    fail('trace ZIP is missing Playwright trace entries');
  }
}

export function parseTraceZip(value) {
  const eocd = findEocd(value);
  if (eocd < 0 || eocd + 22 > value.length) fail('trace ZIP has no valid EOCD');
  const { centralOffset, centralSize, entries } = readEndOfCentralDirectory(value, eocd);

  let cursor = centralOffset;
  let total = 0;
  const extracted = new Map();

  for (let index = 0; index < entries; index += 1) {
    const entry = readCentralDirectoryEntry(value, cursor, centralOffset, eocd);
    const content = inflateTraceEntry(value, entry, centralOffset);
    if (content.length !== entry.uncompressedSize) {
      fail('trace ZIP entry length does not match');
    }

    total += content.length;
    if (total > MAX_TRACE_TOTAL_BYTES) {
      fail('trace ZIP expands beyond the validation bound');
    }
    extracted.set(entry.name, content);
    cursor = entry.end;
  }

  if (cursor !== centralOffset + centralSize) {
    fail('trace ZIP central directory size does not match');
  }
  validateTraceEntries(extracted);
  return extracted;
}

export function validateScreenshots(timeline, evidenceDir) {
  const states = timeline.screenshots.map((screenshot) => screenshot.state);
  if (
    !sameStrings(states, SCREENSHOT_STATES) ||
    new Set(states).size !== SCREENSHOT_STATES.length
  ) {
    fail('required screenshot states do not match');
  }

  const sessionByName = new Map(
    timeline.sessions.map((session) => [session.name, session]),
  );
  for (const screenshot of timeline.screenshots) {
    const session = sessionByName.get(screenshot.session);
    if (
      !session ||
      !session.events.some(
        (event) => event.type === 'state' && event.state === screenshot.state,
      )
    ) {
      fail(`screenshot ${screenshot.state} is not associated with its session state`);
    }
    const file = safeFile(evidenceDir, screenshot.file, `screenshot ${screenshot.state}`);
    validatePng(fs.readFileSync(file), screenshot);
  }
}

export function secretVariants(secretText) {
  const raw = secretText.trim();
  if (!raw) fail('secret file is empty');

  const variants = new Set([raw]);
  const utf8 = Buffer.from(raw, 'utf8');
  variants.add(utf8.toString('hex'));
  variants.add(utf8.toString('base64'));
  variants.add(utf8.toString('base64url'));

  let keyBytes;
  if (/^[a-fA-F0-9]{64}$/.test(raw)) {
    keyBytes = Buffer.from(raw, 'hex');
  } else if (raw.startsWith('nsec1')) {
    try {
      const decoded = nip19.decode(raw);
      if (decoded.type === 'nsec') keyBytes = Buffer.from(decoded.data);
    } catch {
      fail('secret file contains an invalid nsec');
    }
  }

  if (keyBytes) {
    variants.add(keyBytes.toString('hex'));
    variants.add(keyBytes.toString('hex').toUpperCase());
    variants.add(keyBytes.toString('base64'));
    variants.add(keyBytes.toString('base64url'));
    variants.add(nip19.nsecEncode(keyBytes));
  }

  return [...variants].filter((variant) => variant.length >= 8);
}
