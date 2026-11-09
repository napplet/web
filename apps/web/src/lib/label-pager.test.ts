import { describe, expect, it } from 'vitest';
import { exhaustLabels } from './label-pager.mjs';

interface Label { id: string; created_at: number; target: string }

/** A relay answering newest first, ties by id, honouring `#e`, inclusive `until` and `limit`. */
function relay(history: Label[], limit: number) {
  const calls: { ids: string[]; until?: number }[] = [];
  const request = async (ids: string[], until: number | undefined) => {
    calls.push({ ids, until });
    const events = history.filter(event => ids.includes(event.target) && event.created_at <= (until ?? Infinity))
      .sort((a, b) => b.created_at - a.created_at || a.id.localeCompare(b.id)).slice(0, limit);
    return { events, ok: true };
  };
  return { request, calls };
}

describe('label paging', () => {
  it('keeps labels that share the timestamp a full page ended on', async () => {
    // Subtracting a second after the first page would skip `d`, which shares the boundary timestamp with `c`.
    const history = [{ id: 'a', created_at: 9 }, { id: 'b', created_at: 8 }, { id: 'c', created_at: 5 }, { id: 'd', created_at: 5 }, { id: 'e', created_at: 2 }].map(event => ({ ...event, target: 't' }));
    const { request, calls } = relay(history, 3);
    const seen = new Set<string>();
    const complete = await exhaustLabels(async (ids, until) => { const page = await request(ids, until); page.events.forEach(event => seen.add(event.id)); return page; }, ['t'], 3);
    expect(complete).toBe(true);
    expect([...seen].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(calls.map(call => call.until)).toEqual([undefined, 5, 2]);
  });

  it('splits the targets when one timestamp saturates a page, then finishes each half', async () => {
    const history = ['x', 'y'].flatMap(target => [0, 1].map(index => ({ id: `${target}${index}`, created_at: 7, target })));
    const { request, calls } = relay(history, 2);
    const seen = new Set<string>();
    const complete = await exhaustLabels(async (ids, until) => { const page = await request(ids, until); page.events.forEach(event => seen.add(event.id)); return page; }, ['x', 'y'], 2);
    expect(complete).toBe(false);
    // Each single target still saturates the page at one timestamp, so the gap is reported rather than hidden.
    expect(calls.some(call => call.ids.length === 1)).toBe(true);
    const narrow = ['x', 'y'].flatMap(target => [{ id: `${target}0`, created_at: 7, target }, { id: `${target}1`, created_at: 6, target }, { id: `${target}2`, created_at: 7, target }]);
    const wide = relay(narrow, 3);
    expect(await exhaustLabels(wide.request, ['x', 'y'], 3)).toBe(true);
    expect(wide.calls.filter(call => call.ids.length === 1).length).toBeGreaterThan(0);
  });

  it('reports a relay that did not reach EOSE as incomplete', async () => {
    expect(await exhaustLabels(async () => ({ events: [], ok: false }), ['t'], 2)).toBe(false);
  });
});
