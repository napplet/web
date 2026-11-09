import { describe, expect, it } from 'vitest';
import {
  parseCsp,
  effectiveSources,
  evaluateCsp,
  summarizeCsp,
  inspectCspMeta,
  NIP5D_BASELINE_CSP,
} from './csp';

const BASELINE = Object.entries(NIP5D_BASELINE_CSP).map(([name, sources]) => `${name} ${sources.join(' ')}`).join('; ');

describe('parseCsp', () => {
  it('splits directives and lower-cases names', () => {
    const policy = parseCsp("Default-Src 'none'; img-src data: blob:");
    expect(policy.get('default-src')).toEqual(["'none'"]);
    expect(policy.get('img-src')).toEqual(['data:', 'blob:']);
  });

  it('keeps the first occurrence of a duplicated directive, as CSP3 does', () => {
    const policy = parseCsp("connect-src 'none'; connect-src https://evil.example");
    expect(policy.get('connect-src')).toEqual(["'none'"]);
  });

  it('ignores empty segments', () => {
    expect(parseCsp(";; default-src 'none' ;").size).toBe(1);
  });
});

describe('effectiveSources', () => {
  it('falls back worker-src -> child-src -> script-src -> default-src', () => {
    expect(effectiveSources(parseCsp("default-src 'none'"), 'worker-src')).toEqual({ sources: ["'none'"], via: 'default-src' });
    expect(effectiveSources(parseCsp("script-src 'unsafe-inline'; default-src 'none'"), 'worker-src')).toEqual({ sources: ["'unsafe-inline'"], via: 'script-src' });
    expect(effectiveSources(parseCsp("child-src 'none'; script-src 'unsafe-inline'"), 'worker-src')?.via).toBe('child-src');
  });

  it('returns null for base-uri and form-action when absent (no fallback)', () => {
    expect(effectiveSources(parseCsp("default-src 'none'"), 'base-uri')).toBeNull();
    expect(effectiveSources(parseCsp("default-src 'none'"), 'form-action')).toBeNull();
  });
});

describe('evaluateCsp', () => {
  it('accepts the NIP-5D baseline with no deviations', () => {
    const summary = summarizeCsp(evaluateCsp(parseCsp(BASELINE)));
    expect(summary.violations).toEqual([]);
    expect(summary.deviations).toEqual([]);
    expect(summary.ok.map((finding) => finding.directive).sort()).toEqual(Object.keys(NIP5D_BASELINE_CSP).sort());
  });

  it("flags 'unsafe-eval' as a MUST NOT violation", () => {
    const findings = evaluateCsp(parseCsp(BASELINE.replace("'wasm-unsafe-eval'", "'unsafe-eval'")));
    expect(findings.filter((finding) => finding.level === 'violation')).toHaveLength(1);
    expect(findings.find((finding) => finding.level === 'violation')?.directive).toBe('script-src');
  });

  it('treats a stricter script-src (no wasm) as ok', () => {
    const findings = evaluateCsp(parseCsp(BASELINE.replace(" 'wasm-unsafe-eval'", '')));
    expect(findings.find((finding) => finding.directive === 'script-src')?.level).toBe('ok');
    expect(findings.find((finding) => finding.directive === 'script-src')?.detail).toMatch(/stricter/);
  });

  it('reports missing base-uri / form-action as deviations', () => {
    const findings = evaluateCsp(parseCsp("default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'"));
    const deviations = findings.filter((finding) => finding.level === 'deviation').map((finding) => finding.directive);
    expect(deviations).toEqual(expect.arrayContaining(['base-uri', 'form-action']));
    expect(deviations).not.toContain('connect-src');
  });

  it('accepts exact connect-src origin grants and rejects wildcards or schemes', () => {
    const exact = evaluateCsp(parseCsp(BASELINE.replace("connect-src 'none'", 'connect-src https://api.example.com')));
    expect(exact.find((finding) => finding.directive === 'connect-src')?.level).toBe('ok');

    const wildcard = evaluateCsp(parseCsp(BASELINE.replace("connect-src 'none'", 'connect-src https://*.example.com')));
    expect(wildcard.find((finding) => finding.directive === 'connect-src')?.level).toBe('deviation');

    const scheme = evaluateCsp(parseCsp(BASELINE.replace("connect-src 'none'", 'connect-src https:')));
    expect(scheme.find((finding) => finding.directive === 'connect-src')?.level).toBe('deviation');
  });

  it('reports a loosened fetch directive as a deviation', () => {
    const findings = evaluateCsp(parseCsp(BASELINE.replace("frame-src 'none'", 'frame-src https://frames.example')));
    expect(findings.find((finding) => finding.directive === 'frame-src')?.level).toBe('deviation');
  });
});

describe('inspectCspMeta', () => {
  function docWithHead(head: string): Document {
    return new DOMParser().parseFromString(`<!doctype html><html><head>${head}</head><body></body></html>`, 'text/html');
  }

  it('finds a CSP meta that is first in head', () => {
    const inspection = inspectCspMeta(docWithHead(`<meta http-equiv="Content-Security-Policy" content="default-src 'none'"><title>x</title>`));
    expect(inspection.present).toBe(true);
    expect(inspection.first).toBe(true);
    expect(inspection.count).toBe(1);
    expect(inspection.policy.get('default-src')).toEqual(["'none'"]);
  });

  it('reports a CSP meta that is not first, case-insensitively', () => {
    const inspection = inspectCspMeta(docWithHead(`<meta charset="utf-8"><meta http-equiv="content-security-policy" content="default-src 'none'">`));
    expect(inspection.present).toBe(true);
    expect(inspection.first).toBe(false);
  });

  it('reports absence', () => {
    const inspection = inspectCspMeta(docWithHead('<title>x</title>'));
    expect(inspection.present).toBe(false);
    expect(inspection.first).toBe(false);
    expect(inspection.policy.size).toBe(0);
  });

  it('joins multiple CSP metas so the first occurrence of each directive wins', () => {
    const inspection = inspectCspMeta(docWithHead(
      `<meta http-equiv="Content-Security-Policy" content="connect-src 'none'"><meta http-equiv="Content-Security-Policy" content="connect-src https://x.example; img-src data:">`,
    ));
    expect(inspection.count).toBe(2);
    expect(inspection.policy.get('connect-src')).toEqual(["'none'"]);
    expect(inspection.policy.get('img-src')).toEqual(['data:']);
  });
});
