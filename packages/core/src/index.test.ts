import { describe, it, expect } from 'vitest';
import {
  NAP_DOMAINS,
  TOPICS,
} from './index.js';

// Type-level imports (compile check — if this file compiles, types are exported)
import type {
  NapDomain,
  NostrEvent,
  NostrFilter,
  TopicKey,
  TopicValue,
  NamespacedCapability,
  NapProtocolId,
  ShellSupports,
  ShellCapabilities,
  ShellEnvironment,
  NappletShell,
  ShellReadyMessage,
  ShellInitMessage,
} from './index.js';

describe('@napplet/core exports', () => {
  describe('TOPICS', () => {
    it('exports TOPICS object with shell command keys', () => {
      expect(typeof TOPICS).toBe('object');
      expect(TOPICS).not.toBeNull();
      const topicValues = Object.values(TOPICS);
      expect(topicValues.length).toBeGreaterThan(0);
    });

    it('includes stream topics', () => {
      expect(TOPICS.STREAM_CHANNEL_SWITCH).toBe('stream:channel-switch');
    });
  });

  describe('type-level exports (compile check)', () => {
    it('types are usable in type annotations', () => {
      // If this compiles, the types are exported correctly
      const _event: NostrEvent = {} as NostrEvent;
      const _filter: NostrFilter = {} as NostrFilter;
      const _topicKey: TopicKey = 'PROFILE_OPEN';
      const _topicVal: TopicValue = TOPICS.PROFILE_OPEN;
      expect(true).toBe(true);
    });
  });

  describe('namespaced capability types', () => {
    it('exports NAP domain names', () => {
      const napDomain: NapDomain = 'identity';
      expect(NAP_DOMAINS).toContain(napDomain);
      expect(NAP_DOMAINS).toContain('system');
      expect(napDomain).toBe('identity');
    });

    it('NamespacedCapability accepts bare NAP domain shorthand', () => {
      // Compile check: bare NAP domain strings are valid.
      const _relay: NamespacedCapability = 'relay';
      const _storage: NamespacedCapability = 'storage';
      const _inc: NamespacedCapability = 'inc';
      const _theme: NamespacedCapability = 'theme';
      const _media: NamespacedCapability = 'media';
      const _system: NamespacedCapability = 'system';
      expect(true).toBe(true);
    });

    it('NamespacedCapability accepts nap: prefixed domains', () => {
      // Compile check: explicit NAP prefix
      const _napRelay: NamespacedCapability = 'nap:relay';
      const _napStorage: NamespacedCapability = 'nap:storage';
      const _napInc: NamespacedCapability = 'nap:inc';
      const _napTheme: NamespacedCapability = 'nap:theme';
      const _napMedia: NamespacedCapability = 'nap:media';
      const _napSystem: NamespacedCapability = 'nap:system';
      expect(true).toBe(true);
    });

    it('NamespacedCapability accepts perm: prefixed strings', () => {
      // Compile check: permission prefix (per D-03)
      const _permSign: NamespacedCapability = 'perm:sign';
      const _permPopups: NamespacedCapability = 'perm:popups';
      expect(true).toBe(true);
    });

    it('ShellSupports.supports() accepts NamespacedCapability', () => {
      // Compile check: the interface method accepts all forms
      const shell: ShellSupports = { supports: () => false };
      expect(shell.supports('relay')).toBe(false);
      expect(shell.supports('nap:relay')).toBe(false);
      expect(shell.supports('perm:sign')).toBe(false);
    });

    it('ShellSupports.supports() accepts optional numbered NAP protocol ids', () => {
      const protocol: NapProtocolId = 'NAP-01';
      const shell: ShellSupports = { supports: () => true };
      expect(shell.supports('inc', protocol)).toBe(true);
      expect(shell.supports('nap:inc', 'NAP-02')).toBe(true);
    });
  });

  describe('NAP-SHELL foundational types', () => {
    it('exposes ShellCapabilities / ShellEnvironment / wire message shapes', () => {
      const caps: ShellCapabilities = { domains: ['relay'], protocols: { inc: ['NAP-2'] } };
      const env: ShellEnvironment = { capabilities: caps, services: ['signer'] };
      const ready: ShellReadyMessage = { type: 'shell.ready' };
      const init: ShellInitMessage = {
        type: 'shell.init',
        capabilities: caps,
        services: ['signer'],
      };
      expect(ready.type).toBe('shell.ready');
      expect(init.type).toBe('shell.init');
      expect(env.services).toContain('signer');
      expect(caps.domains).toContain('relay');
    });

    it('NappletShell.supports() takes a bare string + optional protocol and ready() yields a ShellEnvironment', async () => {
      const env: ShellEnvironment = {
        capabilities: { domains: ['relay'], protocols: {} },
        services: [],
      };
      const shell: NappletShell = {
        supports: (domain, protocol) => domain === 'relay' && protocol === undefined,
        services: [],
        ready: () => Promise.resolve(env),
        onReady: (handler) => {
          handler(env);
          return { close() {} };
        },
      };
      // Bare-string + protocol calls are type-legal.
      expect(shell.supports('relay')).toBe(true);
      expect(shell.supports('inc', 'NAP-2')).toBe(false);
      // perm: queries still compile against the foundational supports() signature.
      expect(shell.supports('perm:sign')).toBe(false);
      await expect(shell.ready()).resolves.toBe(env);
    });
  });
});
