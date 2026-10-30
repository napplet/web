/** NAP-NAVIGATION #126 report validation; manifest eligibility is runtime-owned. */
import type { NavigationReport } from '@napplet/core';

export function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** JSON maps cannot contain class instances, cycles, undefined, or non-finite numbers. */
export function isJson(value: unknown, ancestors = new Set<object>()): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || ancestors.has(value)) return false;
  if (!Array.isArray(value) && !isRecord(value)) return false;
  if (Object.getOwnPropertySymbols(value).length) return false;
  ancestors.add(value);
  const valid = Array.isArray(value)
    ? isJsonArray(value, ancestors)
    : Object.values(value).every((child) => isJson(child, ancestors));
  ancestors.delete(value);
  return valid;
}

function isJsonArray(value: unknown[], ancestors: Set<object>): boolean {
  for (let index = 0; index < value.length; index++) {
    if (!Object.hasOwn(value, index) || !isJson(value[index], ancestors)) return false;
  }
  return true;
}

export function usableRevision(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/** Return a diagnostic for invalid wire data, without interpreting convention values. */
export function navigationReportError(value: unknown): string | undefined {
  if (!isRecord(value)) return 'report must be a map';
  if (!usableRevision(value.revision)) return 'revision must be a positive integer';
  if (Object.keys(value).some((key) => !['revision', 'location', 'mode', 'deliveryId'].includes(key))) return 'unsupported report field';
  if ('deliveryId' in value && (typeof value.deliveryId !== 'string' || !value.deliveryId)) return 'deliveryId must be non-empty text';
  try {
    if (!isJson(value)) return 'report must contain only JSON values';
  } catch {
    return 'report nesting is not representable';
  }
  if (value.location === null) return 'mode' in value ? 'null location cannot have a mode' : undefined;
  if ('mode' in value && value.mode !== 'push' && value.mode !== 'replace') return 'invalid report mode';
  const location = value.location;
  if (!isRecord(location)) return 'location must be a map or null';
  if (Object.keys(location).some((key) => !['convention', 'payload', 'title'].includes(key))) return 'unsupported location field';
  if (typeof location.convention !== 'string' || !location.convention || /[?#]/.test(location.convention)) return 'convention must be queryless and fragment-free';
  if ('title' in location && typeof location.title !== 'string') return 'title must be text';
  if ('payload' in location && !isRecord(location.payload)) return 'payload must be a map';
  return undefined;
}

export function isNavigationReport(value: unknown): value is NavigationReport {
  return navigationReportError(value) === undefined;
}

/** Compare validated JSON: map order is irrelevant; presence and array order are not. */
export function equalJson(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const a = left as Record<string, unknown>;
  const b = right as Record<string, unknown>;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => Object.hasOwn(b, key) && equalJson(a[key], b[key]));
}
