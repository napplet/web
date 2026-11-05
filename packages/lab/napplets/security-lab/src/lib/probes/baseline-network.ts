// Direct network, subresource, worker and frame boundaries. Every "denied"
// here is backed by CSP evidence (withCspEvidence): a request that merely
// failed with no governing directive is reported as a warning, not a pass.

import { pass, fail, errorText, short, type ProbeResult } from '../probe-result';
import { UNRESOLVABLE_WS_URL } from '../probe-targets';
import { EXTERNAL_URL, expectDenied, expectElementBlocked, cspViolation, withCspEvidence } from './helpers';
import { defineProbes, type ProbeDefinition } from './types';

/** A fetch-style request that must reject or never settle. */
function denied(directive: string, action: () => Promise<unknown> | unknown): () => Promise<ProbeResult> {
  return () => withCspEvidence(directive, () => expectDenied(action));
}

/** A resource-loading element that must error or stay silent. */
function blocked(directive: string, create: () => HTMLElement): () => Promise<ProbeResult> {
  return () => withCspEvidence(directive, () => expectElementBlocked(create));
}

/** A streaming connection that must error or time out before it opens. */
function neverOpens(create: () => WebSocket | EventSource, label: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const source = create();
    source.onopen = () => resolve(`${label} opened`);
    source.onerror = () => {
      source.close();
      reject(new Error(`${label} error`));
    };
    window.setTimeout(() => {
      source.close();
      reject(new Error(`${label} timeout`));
    }, 800);
  });
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, configure: (el: HTMLElementTagNameMap[K]) => void): () => HTMLElement {
  return () => {
    const el = document.createElement(tag);
    configure(el);
    return el;
  };
}

/**
 * `new Worker(blobUrl)` does not throw synchronously under worker-src 'none';
 * the block surfaces asynchronously. We assert the worker never *executes*:
 * ground truth is the CSP violation report, corroborated by the worker's
 * message/error events and a no-execution timeout.
 */
function blobWorkerNeverRuns(): Promise<ProbeResult> {
  return new Promise((resolve) => {
    let settled = false;
    let objectUrl: string | null = null;
    let worker: Worker | null = null;
    const violation = cspViolation('worker-src', 900);
    const done = (result: ProbeResult) => {
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
      objectUrl = URL.createObjectURL(new Blob(['postMessage("opened")'], { type: 'text/javascript' }));
      worker = new Worker(objectUrl);
      worker.addEventListener('message', (event) => done(fail('Unexpected success', `worker executed and posted ${short(event.data)}`)));
      worker.addEventListener('error', () => done(pass('Denied', 'worker failed to start (error event fired)')));
    } catch (err) {
      done(pass('Denied', errorText(err)));
      return;
    }
    window.setTimeout(() => done(pass('Denied', 'worker never executed before timeout')), 900);
  });
}

/**
 * An <iframe> fires `load` even when its navigation is CSP-blocked, so a load
 * event is not proof. Ground truth is the violation report; we corroborate by
 * checking whether the external navigation actually committed.
 */
function childFrameNeverCommits(): Promise<ProbeResult> {
  return new Promise((resolve) => {
    let settled = false;
    const frame = element('iframe', (el) => {
      Object.assign(el.style, { position: 'fixed', left: '-9999px', width: '1px', height: '1px' });
      el.src = `${EXTERNAL_URL}.html`;
    })() as HTMLIFrameElement;
    const violation = cspViolation('frame-src', 900);
    const done = (result: ProbeResult) => {
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
  });
}

export const networkProbes: ProbeDefinition[] = defineProbes(
  { level: 'baseline', ownerArea: 'CSP', expectedResult: 'denied', spec: 'Security Considerations (CSP advisory)' },
  [
    {
      id: 'network.fetch.external',
      category: 'Network',
      probe: 'Direct external fetch',
      expected: "fetch() is blocked by connect-src 'none'",
      severity: 'critical',
      spec: 'Transport (no direct network)',
      run: denied('connect-src', () => fetch(EXTERNAL_URL, { mode: 'no-cors' })),
    },
    {
      id: 'network.xhr.external',
      category: 'Network',
      probe: 'Direct external XMLHttpRequest',
      expected: "XHR is blocked by connect-src 'none'",
      severity: 'critical',
      spec: 'Transport (no direct network)',
      run: denied('connect-src', () => new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', EXTERNAL_URL);
        xhr.onload = () => resolve(`status=${xhr.status}`);
        xhr.onerror = () => reject(new Error('XHR error'));
        xhr.ontimeout = () => reject(new Error('XHR timeout'));
        xhr.timeout = 800;
        xhr.send();
      })),
    },
    {
      id: 'network.websocket.external',
      category: 'Network',
      probe: 'Direct external WebSocket',
      expected: "WebSocket is blocked by connect-src 'none'",
      severity: 'critical',
      spec: 'Transport (no direct WebSocket)',
      run: denied('connect-src', () => neverOpens(() => new WebSocket(UNRESOLVABLE_WS_URL), 'WebSocket')),
    },
    {
      id: 'network.eventsource.external',
      category: 'Network',
      probe: 'Direct external EventSource',
      expected: "EventSource is blocked by connect-src 'none'",
      severity: 'critical',
      spec: 'Transport (no direct network)',
      run: denied('connect-src', () => neverOpens(() => new EventSource(EXTERNAL_URL), 'EventSource')),
    },
    {
      id: 'resource.image.external',
      category: 'Resource',
      probe: 'External image element load',
      expected: 'img-src permits only data: and blob:',
      severity: 'medium',
      run: blocked('img-src', element('img', (img) => { img.src = `${EXTERNAL_URL}.png`; })),
    },
    {
      id: 'resource.script.external',
      category: 'Resource',
      probe: 'External script element load',
      expected: 'script-src permits no network sources',
      severity: 'high',
      run: blocked('script-src', element('script', (script) => { script.src = `${EXTERNAL_URL}.js`; })),
    },
    {
      id: 'resource.style.external',
      category: 'Resource',
      probe: 'External stylesheet load',
      expected: 'style-src permits no network sources',
      severity: 'medium',
      run: blocked('style-src', element('link', (link) => { link.rel = 'stylesheet'; link.href = `${EXTERNAL_URL}.css`; })),
    },
    {
      id: 'resource.font.external',
      category: 'Resource',
      probe: 'External font load',
      expected: 'font-src permits only data:',
      severity: 'medium',
      run: denied('font-src', () => new FontFace('NappletLabProbe', `url(${EXTERNAL_URL}.woff2)`).load()),
    },
    {
      id: 'worker.blob',
      category: 'Worker',
      probe: 'Blob worker construction',
      expected: "Workers fail under worker-src 'none'",
      severity: 'high',
      run: blobWorkerNeverRuns,
    },
    {
      id: 'frame.child.external',
      category: 'Frame',
      probe: 'Child iframe external navigation',
      expected: "Child frames to network URLs fail under frame-src 'none'",
      severity: 'high',
      run: childFrameNeverCommits,
    },
    {
      id: 'media.audio',
      category: 'Media',
      probe: 'Direct audio media load',
      expected: "Media loads fail under media-src 'none'",
      severity: 'medium',
      run: blocked('media-src', element('audio', (audio) => { audio.src = `${EXTERNAL_URL}.mp3`; })),
    },
    {
      id: 'object.embed',
      category: 'Object',
      probe: 'Object/embed external load',
      expected: "Object and embed loads fail under object-src 'none'",
      severity: 'high',
      run: blocked('object-src', element('object', (object) => { object.data = `${EXTERNAL_URL}.html`; })),
    },
  ],
);
