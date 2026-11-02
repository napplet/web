// Runtime-mediated probes: the injected `window.napplet` namespace and the
// NAP port behind it are the only legitimate way out of the sandbox.

import { identity, inc, relay, resource, storage, themeGet } from '@napplet/sdk';
import { pass, fail, warning, skipped, errorText, short } from '../probe-result';
import { inspectNamespace, checkDeclaredDomains } from '../namespace';
import { REQUIRED_DOMAINS, OPTIONAL_DOMAINS } from '../manifest';
import { timeout } from './helpers';
import type { ProbeDefinition } from './types';

export const runtimeProbes: ProbeDefinition[] = [
  {
    id: 'runtime.namespace.present',
    level: 'runtime-mediated',
    category: 'Namespace',
    probe: 'window.napplet injected before napplet code',
    expected: 'Shells MUST inject window.napplet before any napplet script runs',
    expectedResult: 'present',
    severity: 'critical',
    ownerArea: 'Runtime',
    spec: 'Transport (injection)',
    run: async () => {
      const ns = inspectNamespace(window);
      return ns.present
        ? pass('Present', `window.napplet exposes ${ns.domains.length} domain(s): ${ns.domains.join(', ') || 'none'}`)
        : fail('Absent', 'window.napplet is missing; nothing was injected (or the lab is running outside a NIP-5D shell)');
    },
  },
  {
    id: 'runtime.namespace.shape',
    level: 'runtime-mediated',
    category: 'Namespace',
    probe: 'Namespace contains only NAP domain objects',
    expected: 'window.napplet MUST contain only the domain objects the shell exposes, named as bare NAP domains',
    expectedResult: 'present',
    severity: 'medium',
    ownerArea: 'Runtime',
    spec: 'Transport (injection); Runtime Domain Availability',
    run: async () => {
      const ns = inspectNamespace(window);
      if (!ns.present) return skipped('window.napplet is absent');
      const problems: string[] = [];
      if (ns.invalidKeys.length) problems.push(`non-object members: ${ns.invalidKeys.join(', ')}`);
      if (ns.malformedNames.length) problems.push(`not bare domain names: ${ns.malformedNames.join(', ')}`);
      return problems.length
        ? fail('Extra members', problems.join('; '))
        : pass('Domain objects only', `${ns.domains.length} member(s), all objects with bare domain names`);
    },
  },
  {
    id: 'runtime.port.unreachable',
    level: 'runtime-mediated',
    category: 'Namespace',
    probe: 'NAP MessagePort not reachable from napplet code',
    expected: 'The bootstrap MUST keep its port private; no MessagePort is reachable from window or window.napplet',
    expectedResult: 'absent',
    severity: 'critical',
    ownerArea: 'Runtime',
    spec: 'Transport (port handoff); Security Considerations §3',
    run: async () => {
      const ns = inspectNamespace(window);
      return ns.reachablePorts.length
        ? fail('Port reachable', `MessagePort found at ${ns.reachablePorts.join(', ')}; napplet code could forge NAP envelopes`)
        : pass('Unreachable', 'No MessagePort instance reachable from window globals or window.napplet (depth 4)');
    },
  },
  {
    id: 'runtime.declared.required',
    level: 'runtime-mediated',
    category: 'Manifest',
    probe: 'Declared R domains are exposed',
    expected: 'Every manifest R domain is present; a shell missing one SHOULD reject or warn',
    expectedResult: 'present',
    severity: 'medium',
    ownerArea: 'manifest',
    spec: 'Required and Optional Capabilities',
    run: async () => {
      const ns = inspectNamespace(window);
      if (!ns.present) return skipped('window.napplet is absent');
      const { present, missing } = checkDeclaredDomains(ns, REQUIRED_DOMAINS);
      const optional = checkDeclaredDomains(ns, OPTIONAL_DOMAINS);
      const optionalNote = `optional present: ${optional.present.join(', ') || 'none'}`;
      return missing.length
        ? warning('Missing R domains', `missing: ${missing.join(', ')}; present: ${present.join(', ') || 'none'}; ${optionalNote}`)
        : pass('All present', `R domains present: ${present.join(', ')}; ${optionalNote}`);
    },
  },
  {
    id: 'runtime.identity.get',
    level: 'runtime-mediated',
    category: 'Runtime',
    probe: 'Shell-mediated identity request',
    expected: 'Identity resolves only through the NAP-IDENTITY domain',
    expectedResult: 'allowed-via-runtime',
    severity: 'medium',
    ownerArea: 'SDK',
    spec: 'NAP-IDENTITY',
    run: async () => {
      try {
        const pubkey = await timeout(identity.getPublicKey(), 1200);
        return pubkey === 'timeout'
          ? warning('Timed out', 'identity.getPublicKey did not resolve before timeout')
          : pass('Allowed via runtime', `pubkey=${String(pubkey).slice(0, 12)}...`);
      } catch (err) {
        return warning('Runtime denied/unavailable', errorText(err));
      }
    },
  },
  {
    id: 'runtime.relay.query',
    level: 'runtime-mediated',
    category: 'Runtime',
    probe: 'Shell-mediated relay query',
    expected: 'Relay access resolves only through the NAP-RELAY domain (direct WebSocket is blocked above)',
    expectedResult: 'allowed-via-runtime',
    severity: 'medium',
    ownerArea: 'SDK',
    spec: 'NAP-RELAY',
    run: async () => {
      try {
        const events = await timeout(relay.query([{ kinds: [0], limit: 1 }]), 1600);
        return events === 'timeout'
          ? warning('Timed out', 'relay.query did not resolve before timeout')
          : pass('Allowed via runtime', `${events.length} event(s) returned`);
      } catch (err) {
        return warning('Runtime denied/unavailable', errorText(err));
      }
    },
  },
  {
    id: 'runtime.inc.emit',
    level: 'runtime-mediated',
    category: 'Runtime',
    probe: 'Shell-mediated INC emit',
    expected: 'INC emits only through the NAP-INC domain',
    expectedResult: 'allowed-via-runtime',
    severity: 'low',
    ownerArea: 'SDK',
    spec: 'NAP-INC',
    run: async () => {
      try {
        inc.emit('napplet-lab:runtime-inc-probe', { inert: true });
        return pass('Allowed via runtime', 'inc.emit returned without direct browser channel access');
      } catch (err) {
        return warning('Runtime denied/unavailable', errorText(err));
      }
    },
  },
  {
    id: 'runtime.storage',
    level: 'runtime-mediated',
    category: 'Runtime',
    probe: 'Shell-mediated napplet storage',
    expected: 'Storage round-trips only through the NAP-STORAGE domain (browser storage is denied above)',
    expectedResult: 'allowed-via-runtime',
    severity: 'medium',
    ownerArea: 'SDK',
    spec: 'NAP-STORAGE',
    run: async () => {
      try {
        const key = 'napplet-lab-runtime-probe';
        await storage.setItem(key, 'ok');
        const value = await storage.getItem(key);
        await storage.removeItem(key);
        return value === 'ok'
          ? pass('Allowed via runtime', 'storage set/get/remove round-tripped through NAP-STORAGE')
          : warning('Unexpected value', `storage.getItem returned ${short(value)}`);
      } catch (err) {
        return warning('Runtime denied/unavailable', errorText(err));
      }
    },
  },
  {
    id: 'runtime.resource.request',
    level: 'runtime-mediated',
    category: 'Runtime',
    probe: 'Shell-mediated resource request',
    expected: 'Bytes for an https URL arrive via NAP-RESOURCE while direct fetch is CSP-blocked',
    expectedResult: 'allowed-via-runtime',
    severity: 'high',
    ownerArea: 'SDK',
    spec: 'NAP-RESOURCE',
    run: async () => {
      // A `data:` URL would defeat the test: the SDK short-circuits it to a
      // direct fetch(). A public https URL only resolves if the shell mediated.
      // Browser-hosted shells fetch with the browser, so the candidates all
      // send `Access-Control-Allow-Origin: *`; the first success is the proof.
      const candidates = ['https://blossom.primal.net/', 'https://cdn.hzrd149.com/', 'https://api.github.com/zen'];
      const failures: string[] = [];
      for (const url of candidates) {
        try {
          const blob = await timeout(resource.bytes(url), 6000);
          if (blob === 'timeout') {
            failures.push(`${url}: timeout`);
            continue;
          }
          return pass('Allowed via runtime', `runtime delivered ${blob.size} bytes from ${url} (type=${blob.type || 'unknown'}); direct fetch is CSP-blocked`);
        } catch (err) {
          failures.push(`${url}: ${errorText(err)}`);
        }
      }
      return warning('Runtime denied/unavailable', failures.join('; '));
    },
  },
  {
    id: 'runtime.theme.get',
    level: 'runtime-mediated',
    category: 'Runtime',
    probe: 'Shell-mediated theme request',
    expected: 'Theme arrives over the NAP port, never via a window-level theme.get message',
    expectedResult: 'allowed-via-runtime',
    severity: 'low',
    ownerArea: 'SDK',
    spec: 'NAP-THEME',
    run: async () => {
      if (!inspectNamespace(window).domains.includes('theme')) return skipped('theme domain not exposed (declared optional; lab degrades to its fallback palette)');
      try {
        const theme = await timeout(themeGet(), 1500);
        return theme === 'timeout'
          ? warning('Timed out', 'theme.get did not resolve before timeout')
          : pass('Allowed via runtime', `theme ${theme.title ? `"${theme.title}" ` : ''}bg=${theme.colors?.background} text=${theme.colors?.text} primary=${theme.colors?.primary}`);
      } catch (err) {
        return warning('Runtime denied/unavailable', errorText(err));
      }
    },
  },
];
