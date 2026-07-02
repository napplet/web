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
  NappletGlobal,
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

  describe('runtime-injected domain types', () => {
    it('exports NAP domain names', () => {
      const napDomain: NapDomain = 'identity';
      expect(NAP_DOMAINS).toContain(napDomain);
      expect(napDomain).toBe('identity');
      expect(NAP_DOMAINS).toContain('webrtc');
      expect(NAP_DOMAINS).toContain('ble');
      expect(NAP_DOMAINS).toContain('serial');
      expect(NAP_DOMAINS).toContain('lists');
      expect(NAP_DOMAINS).toContain('common');
      expect(NAP_DOMAINS).toContain('dm');
      expect(NAP_DOMAINS).toContain('count');
    });

    it('NappletGlobal represents domain availability by property presence', () => {
      const napplet: NappletGlobal = {};
      expect(napplet.relay).toBeUndefined();

      const injected: NappletGlobal = {
        relay: {
          subscribe: () => ({ close() { /* noop */ } }),
          publish: async () => ({
            id: '',
            pubkey: '',
            created_at: 0,
            kind: 1,
            tags: [],
            content: '',
            sig: '',
          }),
          publishEncrypted: async () => ({
            id: '',
            pubkey: '',
            created_at: 0,
            kind: 4,
            tags: [],
            content: '',
            sig: '',
          }),
          query: async () => [],
        } satisfies NonNullable<NappletGlobal['relay']>,
      };
      expect(typeof injected.relay?.query).toBe('function');
    });
  });
});
