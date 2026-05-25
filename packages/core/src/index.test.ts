import { describe, it, expect } from 'vitest';
import {
  TOPICS,
} from './index.js';

// Type-level imports (compile check — if this file compiles, types are exported)
import type { NostrEvent, NostrFilter, TopicKey, TopicValue, NamespacedCapability, NubProtocolId, ShellSupports } from './index.js';

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
    it('NamespacedCapability accepts bare NUB domain shorthand', () => {
      // Compile check: bare NUB domain strings are valid (per D-02)
      const _relay: NamespacedCapability = 'relay';
      const _storage: NamespacedCapability = 'storage';
      const _ifc: NamespacedCapability = 'ifc';
      const _theme: NamespacedCapability = 'theme';
      const _media: NamespacedCapability = 'media';
      expect(true).toBe(true);
    });

    it('NamespacedCapability accepts nub: prefixed domains', () => {
      // Compile check: explicit NUB prefix
      const _nubRelay: NamespacedCapability = 'nub:relay';
      const _nubStorage: NamespacedCapability = 'nub:storage';
      const _nubIfc: NamespacedCapability = 'nub:ifc';
      const _nubTheme: NamespacedCapability = 'nub:theme';
      const _nubMedia: NamespacedCapability = 'nub:media';
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
      expect(shell.supports('nub:relay')).toBe(false);
      expect(shell.supports('perm:sign')).toBe(false);
    });

    it('ShellSupports.supports() accepts optional numbered NUB protocol ids', () => {
      const protocol: NubProtocolId = 'NUB-01';
      const shell: ShellSupports = { supports: () => true };
      expect(shell.supports('ifc', protocol)).toBe(true);
      expect(shell.supports('nub:ifc', 'NUB-02')).toBe(true);
    });
  });
});
