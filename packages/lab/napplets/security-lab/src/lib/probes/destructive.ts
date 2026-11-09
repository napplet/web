// Destructive probes. Each one does something NIP-5D §Identity says the shell
// MUST answer by closing the port, revoking every grant, and removing this
// iframe. A compliant shell therefore kills the lab mid-probe: the operator
// sees the frame disappear (Paja logs `paja.napplet.revoked`). If the probe
// is still alive when its timer fires, the shell did NOT revoke, and that is
// the finding. These never run as part of "run all" and must be armed first.

import { pass, fail, errorText } from '../probe-result';
import { LT, tag, closeTag } from './helpers';
import type { ProbeDefinition } from './types';

export const REVOCATION_GRACE_MS = 1500;

/** Post a window-level message to the shell and report survival as a failure. */
function windowLevelMessage(payload: Record<string, unknown>, ports: MessagePort[] = []): () => Promise<ReturnType<typeof fail>> {
  return () => new Promise((resolve) => {
    let replied: string | null = null;
    const id = typeof payload.id === 'string' ? payload.id : undefined;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { id?: unknown; type?: unknown } | null;
      if (id && data?.id === id) replied = String(data.type ?? 'unknown');
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage(payload, '*', ports);
    window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      resolve(replied
        ? fail('Forged message answered', `shell replied ${replied} to a window-level message instead of revoking`)
        : fail('Not revoked', `still alive ${REVOCATION_GRACE_MS}ms after a window-level ${String(payload.type)}; NIP-5D requires revocation of the identity binding`));
    }, REVOCATION_GRACE_MS);
  });
}

/**
 * Navigate this frame away from the verified document. The navigation itself
 * destroys this document, so a result can only exist if the frame kept it:
 * either the host page's frame-src lock refused the navigation without
 * committing (a pass), or the call threw.
 */
function selfNavigate(navigate: () => void, target: string): Promise<ReturnType<typeof pass>> {
  return new Promise((resolve) => {
    const before = location.href;
    window.setTimeout(() => {
      resolve(location.href === before
        ? pass('Blocked', `frame kept the verified document ${REVOCATION_GRACE_MS}ms after navigating to ${target}; the host refused the navigation without committing`)
        : fail('Navigated in place', `location became ${location.href} and this document survived; the shell did not revoke`));
    }, REVOCATION_GRACE_MS);
    try {
      navigate();
    } catch (err) {
      resolve(pass('Navigation refused', `${errorText(err)} while navigating to ${target}`));
    }
  });
}

export const destructiveProbes: ProbeDefinition[] = [
  {
    id: 'revoke.window.message',
    level: 'destructive',
    category: 'Identity',
    probe: 'Window-level NAP envelope after handoff',
    expected: 'Any window-level message after napplet.hello MUST revoke the identity binding and remove the iframe',
    expectedResult: 'revoked',
    severity: 'critical',
    ownerArea: 'Runtime',
    spec: 'Identity (document replacement evidence)',
    run: windowLevelMessage({ type: 'identity.getPublicKey', id: 'napplet-lab-window-level' }),
  },
  {
    id: 'revoke.forged.result',
    level: 'destructive',
    category: 'Identity',
    probe: 'Forged result envelope at window level',
    expected: 'A forged *.result envelope is a window-level message: revoke, never route',
    expectedResult: 'revoked',
    severity: 'critical',
    ownerArea: 'Runtime',
    spec: 'Identity; Transport (port-only NAP messages)',
    run: windowLevelMessage({
      type: 'relay.query.result',
      id: 'napplet-lab-forged-result',
      events: [{ event: { id: 'inert', kind: 1, content: 'napplet-lab-marker', tags: [] } }],
    }),
  },
  {
    id: 'revoke.second.hello',
    level: 'destructive',
    category: 'Identity',
    probe: 'Second napplet.hello with a fresh port',
    expected: 'The shell accepts at most one hello per iframe; a second MUST revoke',
    expectedResult: 'revoked',
    severity: 'critical',
    ownerArea: 'Runtime',
    spec: 'Identity (at most one napplet.hello)',
    run: () => {
      const channel = new MessageChannel();
      return windowLevelMessage({ type: 'napplet.hello' }, [channel.port2])();
    },
  },
  {
    id: 'revoke.self.navigation',
    level: 'destructive',
    category: 'Identity',
    probe: 'Self-navigation of the verified frame (about:blank)',
    expected: 'Replacing the verified document fires a second load event; the shell MUST revoke and remove the frame',
    expectedResult: 'revoked',
    severity: 'critical',
    ownerArea: 'Runtime',
    spec: 'Identity (second load event)',
    run: () => selfNavigate(() => location.replace('about:blank'), 'about:blank'),
  },
  {
    id: 'frame.lock.blob',
    level: 'destructive',
    category: 'Identity',
    probe: 'Self-navigation to an unverified blob: document',
    expected: "Host page frame-src 'none' blocks the navigation (kehto/web#382); failing that, the second load MUST revoke. A persisting red banner means unverified code ran in the napplet frame",
    expectedResult: 'denied',
    severity: 'critical',
    ownerArea: 'Runtime',
    spec: 'Identity (document replacement); CSP advisory (frame-src does not survive navigation)',
    run: () => selfNavigate(() => {
      // The replacement announces itself loudly. Under a locked host it never
      // renders; under a NIP-5D shell without the lock it renders for an
      // instant before the second-load revocation removes the frame; if it
      // stays on screen, nothing protected the frame.
      const body = [
        tag('body', 'style="margin:0;background:#7a1111;color:#fff;font:16px/1.4 monospace;padding:24px"'),
        tag('h1', 'id="banner"'), 'UNVERIFIED DOCUMENT IN THE NAPPLET FRAME', closeTag('h1'),
        tag('p'), 'A blob: document replaced the verified napplet after load. The host page did not lock the frame (frame-src) and the shell did not revoke on the second load.', closeTag('p'),
        tag('p', 'id="script"'), 'script did not run', closeTag('p'),
        tag('script'), 'document.getElementById("script").textContent = "script executed in the replacement document";', closeTag('script'),
        closeTag('body'),
      ].join('');
      const url = URL.createObjectURL(new Blob([`${LT}!doctype html>${body}`], { type: 'text/html' }));
      location.replace(url);
    }, 'blob:'),
  },
];
