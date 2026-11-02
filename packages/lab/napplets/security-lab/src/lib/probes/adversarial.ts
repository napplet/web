// Safe-adversarial probes: hostile-looking behaviour a compliant shell
// survives without revoking the lab. Anything that MUST trigger revocation
// lives in destructive.ts instead.

import { pass, fail, info, errorText, short } from '../probe-result';
import { expectParentInaccessible, expectAmbientNostrAbsent, getAmbientNostr, AMBIENT_SIGNER_LABEL, sleep, LT, tag, closeTag } from './helpers';
import type { ProbeDefinition } from './types';

type NestedReport = { token: string; stage: string; got: unknown[] };

function isNestedReport(data: unknown, token: string): data is NestedReport {
  return !!data && typeof data === 'object'
    && (data as NestedReport).token === token
    && typeof (data as NestedReport).stage === 'string';
}

/**
 * Source of the nested srcdoc frame. It performs the NIP-5D handshake toward
 * the *shell* (parent.parent) with its own port and reports back to the lab
 * (its parent) what, if anything, arrived on that port. A compliant shell
 * accepts a hello only from a Window it created, so the nested frame MUST be
 * silently dropped.
 */
export function nestedHelloSource(token: string): string {
  const script = `(function () {
  var token = ${JSON.stringify(token)};
  var got = [];
  var report = function (stage) { parent.postMessage({ token: token, stage: stage, got: got }, '*'); };
  report('started');
  try {
    var channel = new MessageChannel();
    channel.port1.onmessage = function (event) {
      var data = event.data;
      got.push(data && typeof data === 'object' && typeof data.type === 'string' ? data.type : typeof data);
    };
    channel.port1.start();
    parent.parent.postMessage({ type: 'napplet.hello' }, '*', [channel.port2]);
  } catch (err) {
    report('threw:' + String(err));
    return;
  }
  setTimeout(function () { report('done'); }, 600);
})();`;
  // Assembled from pieces so no `<html`, `<head`, `<meta` or `<script` literal
  // exists in our bundle for a string-matching injector to latch onto.
  const safeScript = script.split(`${LT}/`).join(`${LT}\\/`);
  return [
    `${LT}!doctype html>`, tag('html'), tag('head'), tag('meta', 'charset="utf-8"'), closeTag('head'),
    tag('body'), tag('script'), safeScript, closeTag('script'), closeTag('body'), closeTag('html'),
  ].join('');
}

export const adversarialProbes: ProbeDefinition[] = [
  {
    id: 'nested.hello.dropped',
    level: 'safe-adversarial',
    category: 'Transport',
    probe: 'Nested srcdoc frame hello is dropped',
    expected: 'The shell accepts napplet.hello only from an iframe it created; a frame nested inside the napplet gets no port binding',
    expectedResult: 'unusable',
    severity: 'critical',
    ownerArea: 'Runtime',
    spec: 'Transport (source check); Identity',
    run: () => new Promise((resolve) => {
      const token = crypto.randomUUID();
      const frame = document.createElement('iframe');
      frame.setAttribute('sandbox', 'allow-scripts');
      frame.style.position = 'fixed';
      frame.style.left = '-9999px';
      frame.style.width = '1px';
      frame.style.height = '1px';
      let settled = false;
      let started = false;
      const done = (result: ReturnType<typeof pass>) => {
        if (settled) return;
        settled = true;
        window.removeEventListener('message', onMessage);
        frame.remove();
        resolve(result);
      };
      const onMessage = (event: MessageEvent) => {
        if (event.source !== frame.contentWindow || !isNestedReport(event.data, token)) return;
        const report = event.data;
        if (report.stage === 'started') {
          started = true;
          return;
        }
        if (report.stage.startsWith('threw:')) {
          done(pass('Hello refused', `nested frame could not post its hello (${short(report.stage.slice(6))})`));
          return;
        }
        const got = Array.isArray(report.got) ? report.got : [];
        if (got.length) done(fail('Port bound', `shell answered the nested frame's hello with ${got.map(String).join(', ')}; an unverified document obtained a NAP channel`));
        else done(pass('Dropped', 'nested frame posted napplet.hello with a port and received nothing on it'));
      };
      window.addEventListener('message', onMessage);
      frame.srcdoc = nestedHelloSource(token);
      document.body.append(frame);
      window.setTimeout(() => {
        if (!started) done(pass('Child did not run', 'nested srcdoc frame never executed (child-src blocked it, or scripts are disabled for it)'));
        else done(pass('Dropped', 'nested frame reported nothing further before timeout'));
      }, 1500);
    }),
  },
  {
    id: 'parent.location',
    level: 'safe-adversarial',
    category: 'Parent',
    probe: 'Parent/top traversal',
    expected: 'Parent and top privileged DOM/state are not readable across the opaque origin',
    expectedResult: 'denied',
    severity: 'critical',
    ownerArea: 'sandbox',
    spec: 'Security Considerations §1',
    run: () => expectParentInaccessible(() => window.top?.document?.location?.href ?? window.parent.location.href),
  },
  {
    id: 'parent.length',
    level: 'safe-adversarial',
    category: 'Parent',
    probe: 'Sibling frame count via parent.length',
    expected: 'Documented non-guarantee: cross-origin-readable properties let a napplet count sibling frames',
    expectedResult: 'documented-gap',
    severity: 'info',
    ownerArea: 'spec-gap',
    spec: 'Security Considerations (Non-Guarantees)',
    run: async () => {
      try {
        if (window.parent === window) return info('Top-level', 'not framed; nothing to count');
        const count = window.parent.length;
        return info(`${count} frame(s)`, `parent.length=${count} is readable cross-origin (documented, not closed by NIP-5D)`);
      } catch (err) {
        return pass('Denied', errorText(err));
      }
    },
  },
  {
    id: 'webrtc.direct',
    level: 'safe-adversarial',
    category: 'Network',
    probe: 'Direct RTCPeerConnection availability',
    expected: 'Documented non-guarantee: neither sandbox nor CSP governs WebRTC, so it remains an exfiltration channel',
    expectedResult: 'documented-gap',
    severity: 'info',
    ownerArea: 'spec-gap',
    spec: 'Security Considerations (WebRTC)',
    // Availability only: constructing a peer connection with no ICE servers
    // and no offer contacts nothing, and we never do more than that.
    run: async () => {
      const ctor = (window as unknown as Record<string, unknown>).RTCPeerConnection;
      if (typeof ctor !== 'function') return pass('Absent', 'RTCPeerConnection is not defined in this realm');
      try {
        const pc = new (ctor as typeof RTCPeerConnection)();
        pc.close();
        return info('Available', 'RTCPeerConnection is constructible; shells wanting to close this need a host policy outside NIP-5D (NAP-WEBRTC mediates the sanctioned path)');
      } catch (err) {
        return pass('Denied', errorText(err));
      }
    },
  },
  {
    id: 'proto.pollute.local',
    level: 'safe-adversarial',
    category: 'DOM',
    probe: 'Local prototype pollution marker',
    expected: 'Local prototype mutation cannot affect parent/runtime state',
    expectedResult: 'unusable',
    severity: 'medium',
    ownerArea: 'sandbox',
    spec: 'Security Considerations §1',
    run: async () => {
      const key = '__nappletLabPrototypeMarker';
      try {
        (Object.prototype as Record<string, unknown>)[key] = 'inert-marker';
        return await expectParentInaccessible(() => (window.parent as unknown as Record<string, unknown>)[key]);
      } finally {
        delete (Object.prototype as Record<string, unknown>)[key];
      }
    },
  },
  {
    id: 'dom.inject.inert',
    level: 'safe-adversarial',
    category: 'DOM',
    probe: 'Inert DOM script injection marker',
    expected: 'Injected script markup does not execute or escape the iframe',
    expectedResult: 'unusable',
    severity: 'medium',
    ownerArea: 'CSP',
    spec: 'Security Considerations (CSP advisory)',
    run: async () => {
      const marker = '__nappletLabInjected';
      const win = window as unknown as Record<string, unknown>;
      delete win[marker];
      const container = document.createElement('div');
      container.innerHTML = `${tag('script')}window.${marker}=true;${closeTag('script')}${tag('span')}inert${closeTag('span')}`;
      document.body.append(container);
      await sleep(100);
      const executed = Boolean(win[marker]);
      container.remove();
      delete win[marker];
      return executed
        ? fail('Executed', 'Injected script marker changed window state')
        : pass('Inert', 'Injected script markup did not execute');
    },
  },
  {
    id: 'nostr.sign.ambient',
    level: 'safe-adversarial',
    category: 'NIP-07',
    probe: 'Ambient signing method',
    expected: 'Ambient signing is absent/unreachable; signing is shell-mediated',
    expectedResult: 'absent',
    severity: 'critical',
    ownerArea: 'Runtime',
    spec: 'Security Considerations §7',
    run: () => expectAmbientNostrAbsent('signEvent'),
  },
  {
    id: 'nostr.encrypt.ambient',
    level: 'safe-adversarial',
    category: 'NIP-07',
    probe: 'Ambient encryption methods',
    expected: 'Ambient encryption/decryption is absent/unreachable; napplets produce cleartext only',
    expectedResult: 'absent',
    severity: 'critical',
    ownerArea: 'Runtime',
    spec: 'Security Considerations §7',
    run: async () => {
      const nip04 = await expectAmbientNostrAbsent('nip04.encrypt');
      const nip44 = await expectAmbientNostrAbsent('nip44.encrypt');
      return nip04.status === 'fail' || nip44.status === 'fail'
        ? fail('Ambient method present', `${nip04.evidence}; ${nip44.evidence}`)
        : pass('Absent', `${nip04.evidence}; ${nip44.evidence}`);
    },
  },
  {
    id: 'nostr.publish.ambient',
    level: 'safe-adversarial',
    category: 'NIP-07',
    probe: 'Ambient publish method',
    expected: 'Ambient publish is absent/unreachable',
    expectedResult: 'absent',
    severity: 'critical',
    ownerArea: 'Runtime',
    spec: 'Security Considerations §7',
    run: () => expectAmbientNostrAbsent('publish'),
  },
  {
    id: 'nostr.encrypted-note.canary',
    level: 'safe-adversarial',
    category: 'NIP-07',
    probe: 'Encrypted-note-shaped ambient payload',
    expected: 'No ambient surface exists through which a ciphertext-bearing event could be signed or broadcast',
    expectedResult: 'unusable',
    severity: 'critical',
    ownerArea: 'Runtime',
    spec: 'Security Considerations §7',
    run: async () => getAmbientNostr()
      ? fail('Ambient NIP-07 present', 'Refusing to invoke encrypted-note-shaped canary because an ambient signer exists')
      : pass('No ambient path', `No ${AMBIENT_SIGNER_LABEL} surface for an encrypted-note-shaped payload`),
  },
];
