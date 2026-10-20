import { createHash } from 'node:crypto';
import { validateEvent, verifyEvent, type Event } from 'nostr-tools/pure';
import { validateManifestEvent } from '@napplet/conformance';

/** Verify the signed event and exact raw artifact before the browser executes it (NIP-5D §Security Considerations). */
export function verifyManifestArtifact(input: unknown, artifact: Uint8Array): Event {
  if (!validateEvent(input)) throw new Error('Manifest is not a Nostr event');
  // Verify a fresh object: nostr-tools caches verification on a symbol which a
  // caller could otherwise copy from a previously signed event and then mutate.
  const { id, pubkey, created_at, kind, tags, content, sig } = input as Event;
  const event: Event = { id, pubkey, created_at, kind, tags, content, sig };
  let validSignature = false;
  try {
    validSignature = verifyEvent(event);
  } catch {
    // Malformed signature fields are rejected along with cryptographic failures.
  }
  if (!validSignature) throw new Error('Manifest signature or event id is invalid');
  const verdict = validateManifestEvent(event);
  if (!verdict.ok) throw new Error(`Invalid NIP-5D manifest: ${verdict.errors.map((error) => error.message).join('; ')}`);
  const expected = event.tags.find((tag) => tag[0] === 'x')?.[1];
  const actual = createHash('sha256').update(artifact).digest('hex');
  if (actual !== expected) throw new Error(`Artifact SHA-256 mismatch: expected ${expected}, got ${actual}`);
  return event;
}
