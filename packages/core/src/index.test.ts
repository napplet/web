import { describe, it, expect } from 'vitest';
import {
  NAP_DOMAINS,
  NUB_DOMAINS,
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
  NubDomain,
  NubProtocolId,
  ShellSupports,
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
    it('exports NAP domain names while preserving deprecated NUB aliases', () => {
      const napDomain: NapDomain = 'identity';
      const nubDomain: NubDomain = napDomain;
      expect(NAP_DOMAINS).toContain(napDomain);
      expect(NUB_DOMAINS).toBe(NAP_DOMAINS);
      expect(nubDomain).toBe('identity');
    });

    it('NamespacedCapability accepts bare NAP domain shorthand', () => {
      // Compile check: bare NAP domain strings are valid.
      const _relay: NamespacedCapability = 'relay';
      const _storage: NamespacedCapability = 'storage';
      const _ifc: NamespacedCapability = 'ifc';
      const _theme: NamespacedCapability = 'theme';
      const _media: NamespacedCapability = 'media';
      expect(true).toBe(true);
    });

    it('NamespacedCapability accepts nap: prefixed domains', () => {
      // Compile check: explicit NAP prefix
      const _napRelay: NamespacedCapability = 'nap:relay';
      const _napStorage: NamespacedCapability = 'nap:storage';
      const _napIfc: NamespacedCapability = 'nap:ifc';
      const _napTheme: NamespacedCapability = 'nap:theme';
      const _napMedia: NamespacedCapability = 'nap:media';
      expect(true).toBe(true);
    });

    it('NamespacedCapability still accepts deprecated nub: prefixed domains', () => {
      const _legacyRelay: NamespacedCapability = 'nub:relay';
      const _legacyIdentity: NamespacedCapability = 'nub:identity';
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
      expect(shell.supports('nub:relay')).toBe(false);
      expect(shell.supports('perm:sign')).toBe(false);
    });

    it('ShellSupports.supports() accepts optional numbered NAP protocol ids', () => {
      const protocol: NapProtocolId = 'NAP-01';
      const shell: ShellSupports = { supports: () => true };
      expect(shell.supports('ifc', protocol)).toBe(true);
      expect(shell.supports('nap:ifc', 'NAP-02')).toBe(true);
    });

    it('ShellSupports.supports() still accepts deprecated numbered NUB protocol ids', () => {
      const protocol: NubProtocolId = 'NUB-01';
      const shell: ShellSupports = { supports: () => true };
      expect(shell.supports('ifc', protocol)).toBe(true);
    });
  });
});
