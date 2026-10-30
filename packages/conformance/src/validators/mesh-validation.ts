import type { EnvelopeError } from './envelope-types.js';

/**
 * Validate NAP-MESH request constraints from its Error Handling section.
 * https://github.com/napplet/naps/pull/122
 * @param record Outbound mesh envelope.
 * @param errors Accumulates protocol field errors.
 * @returns Nothing; user-specific caps remain shell policy.
 * @example validateMeshRequest({ type: 'mesh.publish', ttl: 0 }, errors);
 */
export function validateMeshRequest(record: Record<string, unknown>, errors: EnvelopeError[]): void {
  if ((record.type === 'mesh.publish' || record.type === 'mesh.subscribe') && record.ttl !== undefined) {
    if (typeof record.ttl !== 'number' || !Number.isInteger(record.ttl) || record.ttl < 0 || record.ttl > 255) {
      errors.push({ code: 'wrong-type', field: 'ttl', message: 'NAP-MESH ttl must be a whole number from 0 to 255' });
    }
  }
  if (record.type === 'mesh.blobs' && Array.isArray(record.hashes)) {
    if (record.hashes.length > 64 || !Array.from(record.hashes).every((hash) => typeof hash === 'string' && /^[0-9a-f]{64}$/i.test(hash))) {
      errors.push({ code: 'wrong-type', field: 'hashes', message: 'NAP-MESH hashes must contain at most 64 hexadecimal SHA-256 hashes' });
    }
  }
  if (record.type === 'mesh.subscribe' && record.filters !== undefined) {
    const filters = Array.isArray(record.filters) ? record.filters : [record.filters];
    if (!Array.from(filters).every((filter) => typeof filter === 'object' && filter !== null && !Array.isArray(filter))) {
      errors.push({ code: 'wrong-type', field: 'filters', message: 'NAP-MESH filters must be a NIP-01 filter object or list of filter objects' });
    }
  }
}
