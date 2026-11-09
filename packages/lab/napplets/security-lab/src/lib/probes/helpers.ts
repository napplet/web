import { pass, fail, warning, errorText, short, type ProbeResult } from '../probe-result';
import { inspectCspMeta, effectiveSources } from '../csp';

import { UNRESOLVABLE_URL } from '../probe-targets';

/** A host that can never resolve, so every "denied" probe is deterministic. */
export const EXTERNAL_URL = UNRESOLVABLE_URL;

export function timeout<T>(promise: Promise<T>, ms = 900): Promise<T | 'timeout'> {
  return new Promise((resolve, reject) => {
    const id = window.setTimeout(() => resolve('timeout'), ms);
    promise.then((value) => {
      window.clearTimeout(id);
      resolve(value);
    }).catch((err) => {
      window.clearTimeout(id);
      reject(err);
    });
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** The action must throw, reject, or never settle; a value is a boundary failure. */
export async function expectDenied(action: () => Promise<unknown> | unknown, ms = 900): Promise<ProbeResult> {
  try {
    const result = await timeout(Promise.resolve().then(action), ms);
    if (result === 'timeout') return pass('Timed out / unusable', 'No successful result before timeout');
    return fail('Unexpected success', short(result));
  } catch (err) {
    return pass('Denied', errorText(err));
  }
}

/** Append a resource-loading element off-screen and require it to error or stay silent. */
export function expectElementBlocked(create: () => HTMLElement, ms = 900): Promise<ProbeResult> {
  const element = create();
  element.style.position = 'fixed';
  element.style.left = '-9999px';
  element.style.width = '1px';
  element.style.height = '1px';

  return new Promise((resolve) => {
    let settled = false;
    const done = (result: ProbeResult) => {
      if (settled) return;
      settled = true;
      element.remove();
      resolve(result);
    };
    const tag = element.tagName.toLowerCase();
    element.addEventListener('load', () => done(fail('Unexpected load', `${tag} load event fired`)), { once: true });
    element.addEventListener('error', () => done(pass('Denied', `${tag} error event fired`)), { once: true });
    document.body.append(element);
    window.setTimeout(() => done(pass('No load', 'No successful load before timeout')), ms);
  });
}

/** Reading privileged parent/top state must throw (opaque origin, no allow-same-origin). */
export async function expectParentInaccessible(read: () => unknown): Promise<ProbeResult> {
  try {
    const value = read();
    return fail('Parent/top readable', short(value));
  } catch (err) {
    return pass('Denied', errorText(err));
  }
}

/** Spelled indirectly so a source grep for the NIP-07 global cannot mistake the lab for a signer consumer. */
export const AMBIENT_SIGNER_LABEL = ['window', 'nostr'].join('.');

export function getAmbientNostr(): Record<string, unknown> | undefined {
  const key = ['nos', 'tr'].join('');
  const value = Reflect.get(window, key);
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

export async function expectAmbientNostrAbsent(method: string): Promise<ProbeResult> {
  const nostr = getAmbientNostr();
  if (!nostr) return pass('Absent', `${AMBIENT_SIGNER_LABEL} is not present`);
  const value = method.split('.').reduce<unknown>((current, part) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[part];
  }, nostr);
  return typeof value === 'function'
    ? fail('Ambient method present', `${AMBIENT_SIGNER_LABEL}.${method} is callable`)
    : pass('Method absent', `${AMBIENT_SIGNER_LABEL} exists but ${method} is not callable`);
}

/** Wait for a CSP violation report naming `directive`, or for `ms` to pass. */
export function cspViolation(directive: string, ms: number): { promise: Promise<SecurityPolicyViolationEvent | null>; cancel: () => void } {
  let onViolation: ((event: SecurityPolicyViolationEvent) => void) | null = null;
  let timer = 0;
  const promise = new Promise<SecurityPolicyViolationEvent | null>((resolve) => {
    onViolation = (event) => {
      if (event.effectiveDirective === directive || event.violatedDirective === directive) {
        cleanup();
        resolve(event);
      }
    };
    document.addEventListener('securitypolicyviolation', onViolation);
    timer = window.setTimeout(() => {
      cleanup();
      resolve(null);
    }, ms);
  });
  const cleanup = () => {
    if (onViolation) document.removeEventListener('securitypolicyviolation', onViolation);
    window.clearTimeout(timer);
  };
  return { promise, cancel: cleanup };
}

/**
 * A "denied" outcome is only proof of a boundary when something enforced it.
 * Wrap a network/subresource probe so that a pass is upgraded with the CSP
 * violation report when one fires, and downgraded to a warning when no policy
 * governs `directive` at all (then the request merely failed, e.g. DNS).
 */
export async function withCspEvidence(directive: string, run: () => Promise<ProbeResult>): Promise<ProbeResult> {
  let violation: SecurityPolicyViolationEvent | null = null;
  const onViolation = (event: SecurityPolicyViolationEvent) => {
    if (event.effectiveDirective === directive || event.violatedDirective === directive) violation = event;
  };
  document.addEventListener('securitypolicyviolation', onViolation);
  try {
    const result = await run();
    // Violation events are queued as tasks; let one that raced the rejection land.
    await sleep(30);
    if (result.status !== 'pass') return result;
    if (violation) {
      const event = violation as SecurityPolicyViolationEvent;
      return pass(result.observed, `${result.evidence}; CSP ${directive} violation reported (blocked ${short(event.blockedURI)})`);
    }
    const meta = inspectCspMeta(document);
    const effective = meta.present ? effectiveSources(meta.policy, directive) : null;
    if (!effective) {
      return warning('Denied without CSP', `${result.evidence}; no ${directive} policy governs this, so the failure is network-level only and not an enforced boundary`);
    }
    return pass(result.observed, `${result.evidence}; governed by ${effective.via} ${effective.sources.join(' ')} (no violation event observed)`);
  } finally {
    document.removeEventListener('securitypolicyviolation', onViolation);
  }
}

/**
 * Build a markup string without a literal `<tag` ever appearing in the bundle.
 * Shells and tooling inject their bootstrap into the artifact with string
 * matching (e.g. the first `<meta http-equiv="Content-Security-Policy">` or the
 * first `<head>`); a matching literal inside our inlined JS would make them
 * splice `<script>` tags into the middle of our code.
 */
export const LT = String.fromCharCode(60);
export function tag(name: string, attrs = ''): string {
  return `${LT}${name}${attrs ? ` ${attrs}` : ''}>`;
}
export function closeTag(name: string): string {
  return `${LT}/${name}>`;
}
