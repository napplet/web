import { describe, expect, it } from 'vitest';
import { haystack, searchArchetypes } from './search';

const entries = [
  { slug: 'text-editor', status: 'candidate', intents: ['napplet:text-editor/edit'], aliases: [], napplets: 1 },
  { slug: 'editor', status: 'candidate', intents: [], aliases: [], napplets: 2 },
  { slug: '3d-model', status: 'candidate', intents: ['napplet:3d-model/open'], aliases: ['cad-viewer'], params: ['url', 'route'], napplets: [1] },
  { slug: 'note', status: 'diverse', intents: ['napplet:note/open'], aliases: [], note: 'Recipe cards too', napplets: 4 },
];

describe('search', () => {
  it('builds a lower-case haystack of names, aliases, intents, params and notes', () => {
    expect(haystack(entries[3])).toBe('note napplet:note/open recipe cards too');
  });

  it('matches every word and ranks exact names first', () => {
    expect(searchArchetypes(entries, 'editor').map(entry => entry.slug)).toEqual(['editor', 'text-editor']);
    expect(searchArchetypes(entries, 'cad').map(entry => entry.slug)).toEqual(['3d-model']);
    expect(searchArchetypes(entries, 'route url').map(entry => entry.slug)).toEqual(['3d-model']);
    expect(searchArchetypes(entries, 'recipe').map(entry => entry.slug)).toEqual(['note']);
    expect(searchArchetypes(entries, 'nothing-like-this')).toEqual([]);
    expect(searchArchetypes(entries, '  ')).toBe(entries);
  });
});
