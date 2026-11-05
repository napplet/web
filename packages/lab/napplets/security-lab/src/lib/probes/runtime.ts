// Runtime-mediated probes: the injected `window.napplet` namespace and the
// NAP port behind it are the only legitimate way out of the sandbox.

import { identity, inc, relay, resource, storage, themeGet } from '@napplet/sdk';
import { pass, fail, warning, skipped, errorText, short, type ProbeResult } from '../probe-result';
import { inspectNamespace, checkDeclaredDomains, type NamespaceInspection } from '../namespace';
import { REQUIRED_DOMAINS, OPTIONAL_DOMAINS } from '../manifest';
import { RESOURCE_PROBE_URLS } from '../probe-targets';
import { timeout } from './helpers';
import { defineProbes, type ProbeDefinition } from './types';

/** Run a probe over a fresh inspection of window.napplet. */
function inspecting(evaluate: (ns: NamespaceInspection) => ProbeResult): () => Promise<ProbeResult> {
  return async () => evaluate(inspectNamespace(window));
}

/** Await a NAP call with a deadline; the shell refusing or stalling is a warning, never a fail. */
async function viaRuntime<T>(name: string, call: () => Promise<T>, ms: number, describe: (value: T) => string): Promise<ProbeResult> {
  try {
    const value = await timeout(call(), ms);
    return value === 'timeout'
      ? warning('Timed out', `${name} did not resolve before timeout`)
      : pass('Allowed via runtime', describe(value));
  } catch (err) {
    return warning('Runtime denied/unavailable', errorText(err));
  }
}

const namespaceProbes = defineProbes(
  { level: 'runtime-mediated', category: 'Namespace', ownerArea: 'Runtime' },
  [
  {
    id: 'runtime.namespace.present',
    probe: 'window.napplet injected before napplet code',
    expected: 'Shells MUST inject window.napplet before any napplet script runs',
    expectedResult: 'present',
    severity: 'critical',
    spec: 'Transport (injection)',
    run: inspecting((ns) => ns.present
      ? pass('Present', `window.napplet exposes ${ns.domains.length} domain(s): ${ns.domains.join(', ') || 'none'}`)
      : fail('Absent', 'window.napplet is missing; nothing was injected (or the lab is running outside a NIP-5D shell)')),
  },
  {
    id: 'runtime.namespace.shape',
    probe: 'Namespace contains only NAP domain objects',
    expected: 'window.napplet MUST contain only the domain objects the shell exposes, named as bare NAP domains',
    expectedResult: 'present',
    severity: 'medium',
    spec: 'Transport (injection); Runtime Domain Availability',
    run: inspecting((ns) => {
      if (!ns.present) return skipped('window.napplet is absent');
      const problems: string[] = [];
      if (ns.invalidKeys.length) problems.push(`non-object members: ${ns.invalidKeys.join(', ')}`);
      if (ns.malformedNames.length) problems.push(`not bare domain names: ${ns.malformedNames.join(', ')}`);
      return problems.length
        ? fail('Extra members', problems.join('; '))
        : pass('Domain objects only', `${ns.domains.length} member(s), all objects with bare domain names`);
    }),
  },
  {
    id: 'runtime.port.unreachable',
    probe: 'NAP MessagePort not reachable from napplet code',
    expected: 'The bootstrap MUST keep its port private; no MessagePort is reachable from window or window.napplet',
    expectedResult: 'absent',
    severity: 'critical',
    spec: 'Transport (port handoff); Security Considerations §3',
    run: inspecting((ns) => ns.reachablePorts.length
      ? fail('Port reachable', `MessagePort found at ${ns.reachablePorts.join(', ')}; napplet code could forge NAP envelopes`)
      : pass('Unreachable', 'No MessagePort instance reachable from window globals or window.napplet (depth 4)')),
  },
  ],
);

const manifestProbes = defineProbes({ level: 'runtime-mediated' }, [
  {
    id: 'runtime.declared.required',
    category: 'Manifest',
    probe: 'Declared R domains are exposed',
    expected: 'Every manifest R domain is present; a shell missing one SHOULD reject or warn',
    expectedResult: 'present',
    severity: 'medium',
    ownerArea: 'manifest',
    spec: 'Required and Optional Capabilities',
    run: inspecting((ns) => {
      if (!ns.present) return skipped('window.napplet is absent');
      const { present, missing } = checkDeclaredDomains(ns, REQUIRED_DOMAINS);
      const optional = checkDeclaredDomains(ns, OPTIONAL_DOMAINS);
      const optionalNote = `optional present: ${optional.present.join(', ') || 'none'}`;
      return missing.length
        ? warning('Missing R domains', `missing: ${missing.join(', ')}; present: ${present.join(', ') || 'none'}; ${optionalNote}`)
        : pass('All present', `R domains present: ${present.join(', ')}; ${optionalNote}`);
    }),
  },
]);

const napProbes = defineProbes(
  { level: 'runtime-mediated', category: 'Runtime', ownerArea: 'SDK', expectedResult: 'allowed-via-runtime' },
  [
  {
    id: 'runtime.identity.get',
    probe: 'Shell-mediated identity request',
    expected: 'Identity resolves only through the NAP-IDENTITY domain',
    severity: 'medium',
    spec: 'NAP-IDENTITY',
    run: () => viaRuntime('identity.getPublicKey', () => identity.getPublicKey(), 1200, (pubkey) => `pubkey=${String(pubkey).slice(0, 12)}...`),
  },
  {
    id: 'runtime.relay.query',
    probe: 'Shell-mediated relay query',
    expected: 'Relay access resolves only through the NAP-RELAY domain (direct WebSocket is blocked above)',
    severity: 'medium',
    spec: 'NAP-RELAY',
    run: () => viaRuntime('relay.query', () => relay.query([{ kinds: [0], limit: 1 }]), 1600, (events) => `${events.length} event(s) returned`),
  },
  {
    id: 'runtime.inc.emit',
    probe: 'Shell-mediated INC emit',
    expected: 'INC emits only through the NAP-INC domain',
    severity: 'low',
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
    probe: 'Shell-mediated napplet storage',
    expected: 'Storage round-trips only through the NAP-STORAGE domain (browser storage is denied above)',
    severity: 'medium',
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
    probe: 'Shell-mediated resource request',
    expected: 'Bytes for an https URL arrive via NAP-RESOURCE while direct fetch is CSP-blocked',
    severity: 'high',
    spec: 'NAP-RESOURCE',
    run: async () => {
      // See RESOURCE_PROBE_URLS: hosts the napplet cannot reach directly, so a
      // returned Blob is proof the shell mediated. First success wins.
      const failures: string[] = [];
      for (const url of RESOURCE_PROBE_URLS) {
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
    probe: 'Shell-mediated theme request',
    expected: 'Theme arrives over the NAP port, never via a window-level theme.get message',
    severity: 'low',
    spec: 'NAP-THEME',
    run: async () => {
      if (!inspectNamespace(window).domains.includes('theme')) return skipped('theme domain not exposed (declared optional; lab degrades to its fallback palette)');
      return viaRuntime('theme.get', () => themeGet(), 1500, (theme) => `theme ${theme.title ? `"${theme.title}" ` : ''}bg=${theme.colors?.background} text=${theme.colors?.text} primary=${theme.colors?.primary}`);
    },
  },
  ],
);

export const runtimeProbes: ProbeDefinition[] = [...namespaceProbes, ...manifestProbes, ...napProbes];
