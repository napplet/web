// Pure probe-result builders and formatting helpers, kept free of DOM access so
// they can be unit-tested without mounting the Svelte component.

export type ProbeStatus = 'pending' | 'running' | 'pass' | 'fail' | 'warning' | 'skipped' | 'info';

export interface ProbeResult {
  observed: string;
  status: ProbeStatus;
  evidence: string;
}

/** The boundary held (a MUST was honoured, or a SHOULD was followed). */
export function pass(observed: string, evidence: string): ProbeResult {
  return { observed, evidence, status: 'pass' };
}

/** A MUST / MUST NOT in NIP-5D was violated. */
export function fail(observed: string, evidence: string): ProbeResult {
  return { observed, evidence, status: 'fail' };
}

/** A SHOULD was not followed, or the runtime path could not be confirmed. */
export function warning(observed: string, evidence: string): ProbeResult {
  return { observed, evidence, status: 'warning' };
}

/** Observation only: a documented non-guarantee, or an allowed capability. */
export function info(observed: string, evidence: string): ProbeResult {
  return { observed, evidence, status: 'info' };
}

export function skipped(evidence: string): ProbeResult {
  return { observed: 'Deferred', evidence, status: 'skipped' };
}

export function errorText(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

export function short(value: unknown): string {
  let text: string;
  try {
    text = typeof value === 'string' ? value : JSON.stringify(value) ?? String(value);
  } catch {
    text = String(value);
  }
  if (!text) return String(value);
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}
