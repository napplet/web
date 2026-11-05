// Sandbox and identity boundaries the browser enforces from the iframe's
// sandbox attribute and the srcdoc delivery, independent of any CSP.

import { pass, fail, warning, errorText, short } from '../probe-result';
import { FOREIGN_BASE_URL } from '../probe-targets';
import { EXTERNAL_URL, cspViolation, sleep, getAmbientNostr, AMBIENT_SIGNER_LABEL } from './helpers';
import { defineProbes, type ProbeDefinition } from './types';

export const sandboxProbes: ProbeDefinition[] = defineProbes({ level: 'baseline', ownerArea: 'sandbox' }, [
  {
    id: 'origin.null',
    category: 'Sandbox',
    probe: 'Opaque origin reports null',
    expected: 'sandbox="allow-scripts" without allow-same-origin yields an opaque origin',
    expectedResult: 'opaque',
    severity: 'critical',
    spec: 'Transport; Security Considerations §1',
    run: async () => window.origin === 'null'
      ? pass('origin=null', 'window.origin is null')
      : fail(`origin=${window.origin}`, 'window.origin was not null: allow-same-origin is present or the frame is not sandboxed'),
  },
  {
    id: 'document.srcdoc',
    category: 'Identity',
    probe: 'Document delivered via srcdoc',
    expected: 'Verified bytes are injected via srcdoc, never a navigated src URL',
    expectedResult: 'present',
    severity: 'critical',
    ownerArea: 'Runtime',
    spec: 'Identity §4',
    run: async () => {
      const href = location.href;
      return href === 'about:srcdoc' || href.startsWith('about:srcdoc#') || href.startsWith('about:srcdoc?')
        ? pass('about:srcdoc', `location.href=${href}`)
        : fail('Navigated src', `location.href=${short(href)}; a navigated document has no verified identity (expected for a dev server, a violation for a published napplet)`);
    },
  },
  {
    id: 'document.referrer',
    category: 'Identity',
    probe: 'Referrer withheld from the napplet',
    expected: 'Shell SHOULD set referrerpolicy="no-referrer" so the shell URL is not disclosed',
    expectedResult: 'absent',
    severity: 'medium',
    ownerArea: 'Runtime',
    spec: 'Transport (referrer)',
    run: async () => document.referrer === ''
      ? pass('Empty', 'document.referrer is empty')
      : warning('Referrer disclosed', `document.referrer=${short(document.referrer)} (SHOULD be withheld)`),
  },
  {
    id: 'popup.open',
    category: 'Sandbox',
    probe: 'window.open() popup',
    expected: 'Popups are refused without allow-popups (link opening is NAP-LINK, shell-mediated)',
    expectedResult: 'denied',
    severity: 'medium',
    spec: 'Transport (sandbox="allow-scripts")',
    run: async () => {
      try {
        const popup = window.open('about:blank', '_blank');
        if (!popup) return pass('Denied', 'window.open returned null');
        try { popup.close(); } catch { /* best effort */ }
        return fail('Popup opened', 'window.open returned a window; allow-popups is present');
      } catch (err) {
        return pass('Denied', errorText(err));
      }
    },
  },
  {
    id: 'form.submit',
    category: 'Form',
    probe: 'Direct form submission',
    expected: "Form submission fails under form-action 'none' (and sandbox without allow-forms)",
    expectedResult: 'denied',
    severity: 'medium',
    ownerArea: 'CSP',
    spec: 'Security Considerations (CSP advisory)',
    run: async () => {
      const before = location.href;
      const form = document.createElement('form');
      form.action = EXTERNAL_URL;
      form.method = 'post';
      form.style.display = 'none';
      document.body.append(form);
      try {
        form.submit();
        await sleep(150);
        return location.href === before
          ? pass('No navigation', 'Location unchanged after form.submit()')
          : fail('Unexpected navigation', `Location changed to ${location.href}`);
      } catch (err) {
        return pass('Denied', errorText(err));
      } finally {
        form.remove();
      }
    },
  },
  {
    id: 'base.uri',
    category: 'DOM',
    probe: 'Injected base element is ignored',
    expected: "base-uri 'none' keeps relative URLs resolving against the srcdoc document",
    expectedResult: 'denied',
    severity: 'medium',
    ownerArea: 'CSP',
    spec: 'Security Considerations (CSP advisory)',
    run: async () => {
      const before = document.baseURI;
      const base = document.createElement('base');
      base.href = FOREIGN_BASE_URL;
      const violation = cspViolation('base-uri', 200);
      document.head.append(base);
      try {
        const event = await violation.promise;
        const after = document.baseURI;
        if (after === before) return pass('Ignored', `baseURI unchanged (${short(after)})${event ? '; CSP base-uri violation reported' : ''}`);
        return fail('Base changed', `baseURI became ${short(after)}`);
      } finally {
        base.remove();
      }
    },
  },
  {
    id: 'nip07.window',
    category: 'NIP-07',
    probe: 'NIP-07 ambient global',
    expected: 'Shells MUST NOT provide the NIP-07 signer global to napplet iframes',
    expectedResult: 'absent',
    severity: 'critical',
    ownerArea: 'Runtime',
    spec: 'Transport; Security Considerations §7',
    run: async () => getAmbientNostr()
      ? fail('Ambient signer present', `${AMBIENT_SIGNER_LABEL} is reachable`)
      : pass('Absent', `${AMBIENT_SIGNER_LABEL} is not present`),
  },
]);
