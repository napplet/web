// Baseline probes: boundaries the browser enforces from the sandbox attribute
// and the shell-injected CSP, with no shell cooperation at run time.

import { pass, fail, warning, info, errorText, short } from '../probe-result';
import { inspectCspMeta, evaluateCsp, summarizeCsp, describeFindings } from '../csp';
import { EXTERNAL_URL, expectDenied, expectElementBlocked, cspViolation, withCspEvidence, sleep, getAmbientNostr, AMBIENT_SIGNER_LABEL } from './helpers';
import type { ProbeDefinition } from './types';

// Smallest valid WebAssembly module: magic + version, no sections.
const EMPTY_WASM = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);

export const baselineProbes: ProbeDefinition[] = [
  {
    id: 'origin.null',
    level: 'baseline',
    category: 'Sandbox',
    probe: 'Opaque origin reports null',
    expected: 'sandbox="allow-scripts" without allow-same-origin yields an opaque origin',
    expectedResult: 'opaque',
    severity: 'critical',
    ownerArea: 'sandbox',
    spec: 'Transport; Security Considerations §1',
    run: async () => window.origin === 'null'
      ? pass('origin=null', 'window.origin is null')
      : fail(`origin=${window.origin}`, 'window.origin was not null: allow-same-origin is present or the frame is not sandboxed'),
  },
  {
    id: 'document.srcdoc',
    level: 'baseline',
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
    level: 'baseline',
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
    id: 'csp.meta.present',
    level: 'baseline',
    category: 'CSP',
    probe: 'Shell-injected CSP meta exists',
    expected: 'A srcdoc document has no HTTP headers, so the shell SHOULD inject a meta CSP',
    expectedResult: 'present',
    severity: 'high',
    ownerArea: 'CSP',
    spec: 'Security Considerations (CSP advisory)',
    run: async () => {
      const meta = inspectCspMeta(document);
      if (!meta.present) return warning('Absent', 'No Content-Security-Policy meta element in the document; every network/worker/frame boundary below relies on the opaque origin alone');
      return pass('Present', `${meta.count} CSP meta element(s): ${short(meta.content)}`);
    },
  },
  {
    id: 'csp.meta.first',
    level: 'baseline',
    category: 'CSP',
    probe: 'CSP meta precedes every other head element',
    expected: 'The policy SHOULD be the first element in head so nothing is parsed before it applies',
    expectedResult: 'present',
    severity: 'high',
    ownerArea: 'CSP',
    spec: 'Security Considerations (CSP advisory)',
    run: async () => {
      const meta = inspectCspMeta(document);
      if (!meta.present) return warning('No CSP', 'Nothing to order: no CSP meta present');
      const first = document.head?.firstElementChild;
      return meta.first
        ? pass('First in head', 'head.firstElementChild is the CSP meta')
        : warning('Not first', `head.firstElementChild is <${first?.tagName.toLowerCase() ?? 'none'}>; content before the policy is parsed unrestricted`);
    },
  },
  {
    id: 'csp.baseline',
    level: 'baseline',
    category: 'CSP',
    probe: 'Policy matches the NIP-5D baseline',
    expected: "Every baseline directive is 'none' or stricter; 'unsafe-eval' is never present",
    expectedResult: 'present',
    severity: 'high',
    ownerArea: 'CSP',
    spec: 'Security Considerations (CSP advisory)',
    run: async () => {
      const meta = inspectCspMeta(document);
      if (!meta.present) return warning('No CSP', 'No policy to evaluate');
      const summary = summarizeCsp(evaluateCsp(meta.policy));
      if (summary.violations.length) return fail('MUST NOT violated', describeFindings(summary.violations));
      if (summary.deviations.length) return warning(`${summary.deviations.length} deviation(s)`, describeFindings(summary.deviations));
      return pass('Baseline met', `${summary.ok.length} directives at or stricter than baseline`);
    },
  },
  {
    id: 'csp.eval',
    level: 'baseline',
    category: 'CSP',
    probe: 'JavaScript string evaluation',
    expected: "eval() is refused: script-src carries 'wasm-unsafe-eval', never 'unsafe-eval'",
    expectedResult: 'denied',
    severity: 'high',
    ownerArea: 'CSP',
    spec: 'Security Considerations (CSP advisory)',
    // eslint-disable-next-line no-eval
    run: () => expectDenied(() => (0, eval)('1 + 1')),
  },
  {
    id: 'csp.function',
    level: 'baseline',
    category: 'CSP',
    probe: 'Function constructor',
    expected: "new Function() is refused under script-src without 'unsafe-eval'",
    expectedResult: 'denied',
    severity: 'high',
    ownerArea: 'CSP',
    spec: 'Security Considerations (CSP advisory)',
    run: () => expectDenied(() => new Function('return 1')()),
  },
  {
    id: 'csp.wasm',
    level: 'baseline',
    category: 'CSP',
    probe: 'WebAssembly compilation',
    expected: "'wasm-unsafe-eval' permits WebAssembly without enabling JavaScript eval",
    expectedResult: 'allowed',
    severity: 'info',
    ownerArea: 'CSP',
    spec: 'Security Considerations (CSP advisory)',
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
    level: 'baseline',
    category: 'CSP',
    probe: 'Dynamic import of an external module',
    expected: 'import() of a remote module fails under script-src without network sources',
    expectedResult: 'denied',
    severity: 'high',
    ownerArea: 'CSP',
    spec: 'Security Considerations (CSP advisory)',
    run: () => withCspEvidence('script-src', () => {
      const url = `${EXTERNAL_URL}.mjs`;
      return expectDenied(() => import(/* @vite-ignore */ url), 1500);
    }),
  },
  {
    id: 'storage.local',
    level: 'baseline',
    category: 'Storage',
    probe: 'Direct localStorage access',
    expected: 'localStorage is unavailable in the opaque-origin iframe',
    expectedResult: 'denied',
    severity: 'high',
    ownerArea: 'sandbox',
    spec: 'Transport (no storage access)',
    run: () => expectDenied(() => localStorage.setItem('napplet-lab-direct', '1')),
  },
  {
    id: 'storage.session',
    level: 'baseline',
    category: 'Storage',
    probe: 'Direct sessionStorage access',
    expected: 'sessionStorage is unavailable in the opaque-origin iframe',
    expectedResult: 'denied',
    severity: 'high',
    ownerArea: 'sandbox',
    spec: 'Transport (no storage access)',
    run: () => expectDenied(() => sessionStorage.setItem('napplet-lab-direct', '1')),
  },
  {
    id: 'storage.cookie',
    level: 'baseline',
    category: 'Storage',
    probe: 'Direct document.cookie access',
    expected: 'Cookies are unreadable and unwritable from an opaque origin',
    expectedResult: 'denied',
    severity: 'medium',
    ownerArea: 'sandbox',
    spec: 'Transport (no storage access)',
    run: () => expectDenied(() => {
      document.cookie = 'napplet-lab=1';
      return `cookie=${document.cookie}`;
    }),
  },
  {
    id: 'storage.indexeddb',
    level: 'baseline',
    category: 'Storage',
    probe: 'Direct indexedDB.open()',
    expected: 'IndexedDB is denied or unusable in the opaque-origin iframe',
    expectedResult: 'denied',
    severity: 'high',
    ownerArea: 'sandbox',
    spec: 'Transport (no storage access)',
    run: () => expectDenied(() => new Promise((resolve, reject) => {
      const request = indexedDB.open('napplet-lab-direct');
      request.onsuccess = () => resolve('indexedDB opened');
      request.onerror = () => reject(request.error ?? new Error('indexedDB error'));
      request.onblocked = () => reject(new Error('indexedDB blocked'));
    })),
  },
  {
    id: 'storage.cache',
    level: 'baseline',
    category: 'Storage',
    probe: 'Cache Storage',
    expected: 'caches.open() is denied for an opaque origin',
    expectedResult: 'denied',
    severity: 'medium',
    ownerArea: 'sandbox',
    spec: 'Transport (no storage access)',
    run: () => expectDenied(() => caches.open('napplet-lab-direct')),
  },
  {
    id: 'storage.serviceworker',
    level: 'baseline',
    category: 'Storage',
    probe: 'Service worker registration',
    expected: 'Service workers cannot be registered from the sandbox',
    expectedResult: 'denied',
    severity: 'high',
    ownerArea: 'sandbox',
    spec: 'Security Considerations §1',
    run: () => expectDenied(() => navigator.serviceWorker.register('/napplet-lab-sw.js')),
  },
  {
    id: 'network.fetch.external',
    level: 'baseline',
    category: 'Network',
    probe: 'Direct external fetch',
    expected: "fetch() is blocked by connect-src 'none'",
    expectedResult: 'denied',
    severity: 'critical',
    ownerArea: 'CSP',
    spec: 'Transport (no direct network)',
    run: () => withCspEvidence('connect-src', () => expectDenied(() => fetch(EXTERNAL_URL, { mode: 'no-cors' }))),
  },
  {
    id: 'network.xhr.external',
    level: 'baseline',
    category: 'Network',
    probe: 'Direct external XMLHttpRequest',
    expected: "XHR is blocked by connect-src 'none'",
    expectedResult: 'denied',
    severity: 'critical',
    ownerArea: 'CSP',
    spec: 'Transport (no direct network)',
    run: () => withCspEvidence('connect-src', () => expectDenied(() => new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', EXTERNAL_URL);
      xhr.onload = () => resolve(`status=${xhr.status}`);
      xhr.onerror = () => reject(new Error('XHR error'));
      xhr.ontimeout = () => reject(new Error('XHR timeout'));
      xhr.timeout = 800;
      xhr.send();
    }))),
  },
  {
    id: 'network.websocket.external',
    level: 'baseline',
    category: 'Network',
    probe: 'Direct external WebSocket',
    expected: "WebSocket is blocked by connect-src 'none'",
    expectedResult: 'denied',
    severity: 'critical',
    ownerArea: 'CSP',
    spec: 'Transport (no direct WebSocket)',
    run: () => withCspEvidence('connect-src', () => expectDenied(() => new Promise((resolve, reject) => {
      const ws = new WebSocket('wss://example.invalid/napplet-lab');
      ws.onopen = () => resolve('websocket opened');
      ws.onerror = () => reject(new Error('WebSocket error'));
      window.setTimeout(() => reject(new Error('WebSocket timeout')), 800);
    }))),
  },
  {
    id: 'network.eventsource.external',
    level: 'baseline',
    category: 'Network',
    probe: 'Direct external EventSource',
    expected: "EventSource is blocked by connect-src 'none'",
    expectedResult: 'denied',
    severity: 'critical',
    ownerArea: 'CSP',
    spec: 'Transport (no direct network)',
    run: () => withCspEvidence('connect-src', () => expectDenied(() => new Promise((resolve, reject) => {
      const es = new EventSource(EXTERNAL_URL);
      es.onopen = () => resolve('eventsource opened');
      es.onerror = () => {
        es.close();
        reject(new Error('EventSource error'));
      };
      window.setTimeout(() => {
        es.close();
        reject(new Error('EventSource timeout'));
      }, 800);
    }))),
  },
  {
    id: 'resource.image.external',
    level: 'baseline',
    category: 'Resource',
    probe: 'External image element load',
    expected: 'img-src permits only data: and blob:',
    expectedResult: 'denied',
    severity: 'medium',
    ownerArea: 'CSP',
    spec: 'Security Considerations (CSP advisory)',
    run: () => withCspEvidence('img-src', () => expectElementBlocked(() => {
      const img = document.createElement('img');
      img.src = `${EXTERNAL_URL}.png`;
      return img;
    })),
  },
  {
    id: 'resource.script.external',
    level: 'baseline',
    category: 'Resource',
    probe: 'External script element load',
    expected: 'script-src permits no network sources',
    expectedResult: 'denied',
    severity: 'high',
    ownerArea: 'CSP',
    spec: 'Security Considerations (CSP advisory)',
    run: () => withCspEvidence('script-src', () => expectElementBlocked(() => {
      const script = document.createElement('script');
      script.src = `${EXTERNAL_URL}.js`;
      return script;
    })),
  },
  {
    id: 'resource.style.external',
    level: 'baseline',
    category: 'Resource',
    probe: 'External stylesheet load',
    expected: 'style-src permits no network sources',
    expectedResult: 'denied',
    severity: 'medium',
    ownerArea: 'CSP',
    spec: 'Security Considerations (CSP advisory)',
    run: () => withCspEvidence('style-src', () => expectElementBlocked(() => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `${EXTERNAL_URL}.css`;
      return link;
    })),
  },
  {
    id: 'resource.font.external',
    level: 'baseline',
    category: 'Resource',
    probe: 'External font load',
    expected: 'font-src permits only data:',
    expectedResult: 'denied',
    severity: 'medium',
    ownerArea: 'CSP',
    spec: 'Security Considerations (CSP advisory)',
    run: () => withCspEvidence('font-src', () => expectDenied(() => new FontFace('NappletLabProbe', `url(${EXTERNAL_URL}.woff2)`).load())),
  },
  {
    id: 'worker.blob',
    level: 'baseline',
    category: 'Worker',
    probe: 'Blob worker construction',
    expected: "Workers fail under worker-src 'none'",
    expectedResult: 'denied',
    severity: 'high',
    ownerArea: 'CSP',
    spec: 'Security Considerations (CSP advisory)',
    // `new Worker(blobUrl)` does not throw synchronously under worker-src 'none';
    // the block surfaces asynchronously. We assert the worker never *executes*.
    run: () => new Promise((resolve) => {
      let settled = false;
      let objectUrl: string | null = null;
      let worker: Worker | null = null;
      const violation = cspViolation('worker-src', 900);
      const done = (result: ReturnType<typeof pass>) => {
        if (settled) return;
        settled = true;
        violation.cancel();
        worker?.terminate();
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        resolve(result);
      };
      void violation.promise.then((event) => {
        if (event) done(pass('Denied', `CSP worker-src violation reported (blocked ${short(event.blockedURI)})`));
      });
      try {
        const blob = new Blob(['postMessage("opened")'], { type: 'text/javascript' });
        objectUrl = URL.createObjectURL(blob);
        worker = new Worker(objectUrl);
        worker.addEventListener('message', (event) => done(fail('Unexpected success', `worker executed and posted ${short(event.data)}`)));
        worker.addEventListener('error', () => done(pass('Denied', 'worker failed to start (error event fired)')));
      } catch (err) {
        done(pass('Denied', errorText(err)));
        return;
      }
      window.setTimeout(() => done(pass('Denied', 'worker never executed before timeout')), 900);
    }),
  },
  {
    id: 'frame.child.external',
    level: 'baseline',
    category: 'Frame',
    probe: 'Child iframe external navigation',
    expected: "Child frames to network URLs fail under frame-src 'none'",
    expectedResult: 'denied',
    severity: 'high',
    ownerArea: 'CSP',
    spec: 'Security Considerations (CSP advisory)',
    // An <iframe> fires `load` even when its navigation is CSP-blocked, so a
    // load event is not proof. Ground truth is the violation report; we
    // corroborate by checking whether the external navigation committed.
    run: () => new Promise((resolve) => {
      let settled = false;
      const frame = document.createElement('iframe');
      frame.style.position = 'fixed';
      frame.style.left = '-9999px';
      frame.style.width = '1px';
      frame.style.height = '1px';
      frame.src = `${EXTERNAL_URL}.html`;
      const violation = cspViolation('frame-src', 900);
      const done = (result: ReturnType<typeof pass>) => {
        if (settled) return;
        settled = true;
        violation.cancel();
        frame.remove();
        resolve(result);
      };
      void violation.promise.then((event) => {
        if (event) done(pass('Denied', `CSP frame-src violation reported (blocked ${short(event.blockedURI)})`));
      });
      frame.addEventListener('load', () => {
        window.setTimeout(() => {
          if (settled) return;
          try {
            const href = frame.contentWindow?.location?.href ?? '';
            if (href.startsWith(EXTERNAL_URL)) done(fail('Unexpected load', `frame committed navigation to ${href}`));
            else done(pass('Denied', `frame did not load external content (stayed on ${href || 'empty document'})`));
          } catch (err) {
            done(fail('Unexpected load', `frame committed a cross-origin document, so frame-src did not block (${errorText(err)})`));
          }
        }, 0);
      });
      document.body.append(frame);
      window.setTimeout(() => done(pass('Denied', 'no frame navigation committed before timeout')), 900);
    }),
  },
  {
    id: 'form.submit',
    level: 'baseline',
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
    level: 'baseline',
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
      base.href = 'https://example.invalid/napplet-lab-base/';
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
    id: 'popup.open',
    level: 'baseline',
    category: 'Sandbox',
    probe: 'window.open() popup',
    expected: 'Popups are refused without allow-popups (link opening is NAP-LINK, shell-mediated)',
    expectedResult: 'denied',
    severity: 'medium',
    ownerArea: 'sandbox',
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
    id: 'media.audio',
    level: 'baseline',
    category: 'Media',
    probe: 'Direct audio media load',
    expected: "Media loads fail under media-src 'none'",
    expectedResult: 'denied',
    severity: 'medium',
    ownerArea: 'CSP',
    spec: 'Security Considerations (CSP advisory)',
    run: () => withCspEvidence('media-src', () => expectElementBlocked(() => {
      const audio = document.createElement('audio');
      audio.src = `${EXTERNAL_URL}.mp3`;
      return audio;
    })),
  },
  {
    id: 'object.embed',
    level: 'baseline',
    category: 'Object',
    probe: 'Object/embed external load',
    expected: "Object and embed loads fail under object-src 'none'",
    expectedResult: 'denied',
    severity: 'high',
    ownerArea: 'CSP',
    spec: 'Security Considerations (CSP advisory)',
    run: () => withCspEvidence('object-src', () => expectElementBlocked(() => {
      const object = document.createElement('object');
      object.data = `${EXTERNAL_URL}.html`;
      return object;
    })),
  },
  {
    id: 'nip07.window',
    level: 'baseline',
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
];
