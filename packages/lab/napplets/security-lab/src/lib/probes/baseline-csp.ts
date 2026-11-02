// The NIP-5D CSP advisory: a shell SHOULD inject a meta policy first in head,
// and MUST NOT substitute 'unsafe-eval' for 'wasm-unsafe-eval'.

import { pass, warning, fail, info, errorText, short } from '../probe-result';
import { inspectCspMeta, evaluateCsp, summarizeCsp, describeFindings, type CspMetaInspection } from '../csp';
import { EXTERNAL_URL, expectDenied, withCspEvidence } from './helpers';
import { defineProbes, type ProbeDefinition } from './types';

// Smallest valid WebAssembly module: magic + version, no sections.
const EMPTY_WASM = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);

/** Shared preamble for the probes that inspect the injected policy. */
async function withCspMeta(evaluate: (meta: CspMetaInspection) => ReturnType<typeof pass>, absent: string): Promise<ReturnType<typeof pass>> {
  const meta = inspectCspMeta(document);
  return meta.present ? evaluate(meta) : warning(absent === 'none' ? 'No CSP' : 'Absent', absent === 'none' ? 'No policy present' : absent);
}

export const cspProbes: ProbeDefinition[] = defineProbes(
  { level: 'baseline', category: 'CSP', ownerArea: 'CSP', spec: 'Security Considerations (CSP advisory)', severity: 'high' },
  [
    {
      id: 'csp.meta.present',
      probe: 'Shell-injected CSP meta exists',
      expected: 'A srcdoc document has no HTTP headers, so the shell SHOULD inject a meta CSP',
      expectedResult: 'present',
      run: () => withCspMeta(
        (meta) => pass('Present', `${meta.count} CSP meta element(s): ${short(meta.content)}`),
        'No Content-Security-Policy meta element in the document; every network/worker/frame boundary below relies on the opaque origin alone',
      ),
    },
    {
      id: 'csp.meta.first',
      probe: 'CSP meta precedes every other head element',
      expected: 'The policy SHOULD be the first element in head so nothing is parsed before it applies',
      expectedResult: 'present',
      run: () => withCspMeta((meta) => {
        const first = document.head?.firstElementChild;
        return meta.first
          ? pass('First in head', 'head.firstElementChild is the CSP meta')
          : warning('Not first', `head.firstElementChild is <${first?.tagName.toLowerCase() ?? 'none'}>; content before the policy is parsed unrestricted`);
      }, 'none'),
    },
    {
      id: 'csp.baseline',
      probe: 'Policy matches the NIP-5D baseline',
      expected: "Every baseline directive is 'none' or stricter; 'unsafe-eval' is never present",
      expectedResult: 'present',
      run: () => withCspMeta((meta) => {
        const summary = summarizeCsp(evaluateCsp(meta.policy));
        if (summary.violations.length) return fail('MUST NOT violated', describeFindings(summary.violations));
        if (summary.deviations.length) return warning(`${summary.deviations.length} deviation(s)`, describeFindings(summary.deviations));
        return pass('Baseline met', `${summary.ok.length} directives at or stricter than baseline`);
      }, 'none'),
    },
    {
      id: 'csp.eval',
      probe: 'JavaScript string evaluation',
      expected: "eval() is refused: script-src carries 'wasm-unsafe-eval', never 'unsafe-eval'",
      expectedResult: 'denied',
      // aislop-ignore-next-line eslint/no-eval -- the probe exists to prove the shell's CSP refuses dynamic code.
      // eslint-disable-next-line no-eval
      run: () => expectDenied(() => (0, eval)('1 + 1')),
    },
    {
      id: 'csp.function',
      probe: 'Function constructor',
      expected: "new Function() is refused under script-src without 'unsafe-eval'",
      expectedResult: 'denied',
      // aislop-ignore-next-line security/new-function -- the probe exists to prove the shell's CSP refuses dynamic code.
      run: () => expectDenied(() => new Function('return 1')()),
    },
    {
      id: 'csp.wasm',
      probe: 'WebAssembly compilation',
      expected: "'wasm-unsafe-eval' permits WebAssembly without enabling JavaScript eval",
      expectedResult: 'allowed',
      severity: 'info',
      run: async () => {
        if (typeof WebAssembly === 'undefined') return info('Unavailable', 'WebAssembly is not defined in this realm');
        try {
          await WebAssembly.compile(EMPTY_WASM);
          return info('Allowed', "WebAssembly.compile succeeded (expected under 'wasm-unsafe-eval')");
        } catch (err) {
          return info('Refused', `${errorText(err)} (host is stricter than the baseline; not a violation)`);
        }
      },
    },
    {
      id: 'csp.import.external',
      probe: 'Dynamic import of an external module',
      expected: 'import() of a remote module fails under script-src without network sources',
      expectedResult: 'denied',
      run: () => withCspEvidence('script-src', () => {
        const url = `${EXTERNAL_URL}.mjs`;
        return expectDenied(() => import(/* @vite-ignore */ url), 1500);
      }),
    },
  ],
);
