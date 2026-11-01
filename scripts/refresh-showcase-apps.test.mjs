// Unit tests for the pure Napshot label collection used by scripts/refresh-showcase-apps.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { collectLabels, LABEL_BATCH } from './lib/napshot-labels.mjs';

const labelers = ['a'.repeat(64)];
const stranger = 'f'.repeat(64);
const target = (index) => `${index}`.padStart(64, '0');
const label = (pubkey, index, created = 100) => ({ id: `${pubkey}:${index}`, pubkey, created_at: created, tags: [['e', target(index)]] });
const fillers = (count, start = 0) => Array.from({ length: count }, (_, offset) => label(stranger, start + offset));

test('collectLabels batches every target and keeps each request within the batch size', async () => {
  const requests = [];
  const request = async (url, filter) => { requests.push({ url, filter }); return { events: [], ok: url === 'wss://one.example' }; };
  const targets = Array.from({ length: LABEL_BATCH * 2 + 7 }, (_, index) => target(index));
  const { labels, complete, batches } = await collectLabels(request, { relays: ['wss://one.example', 'wss://two.example'], labelers, targets, limit: 80 });
  assert.equal(batches, 3);
  assert.equal(complete, 3);
  assert.equal(labels.length, 0);
  // Each batch is asked of every relay, in target order, with the trust and namespace filters.
  const first = requests.filter(({ filter }) => filter['#e'][0] === target(0));
  assert.deepEqual(first.map(({ url }) => url), ['wss://one.example', 'wss://two.example']);
  const seen = new Set(requests.map(({ filter }) => JSON.stringify(filter['#e'])));
  assert.equal(seen.size, 3);
  for (const { filter } of requests) {
    assert.equal(filter.kinds[0], 1985);
    assert.deepEqual(filter.authors, labelers);
    assert.deepEqual(filter['#L'], ['#screenshot']);
    assert.ok(filter['#e'].length <= LABEL_BATCH);
    assert.equal(filter.limit, 80);
    assert.equal(filter.until, undefined);
  }
  const union = new Set(requests.flatMap(({ filter }) => filter['#e']));
  assert.equal(union.size, targets.length);
});

test('collectLabels pages a full relay page with until until a page comes back short', async () => {
  const calls = [];
  const trusted = label(labelers[0], 0, 50);
  const request = async (url, filter) => {
    calls.push(filter);
    // A full page of untrusted filler first, then the trusted label on the older page.
    return calls.length === 1 ? { events: fillers(80, 1), ok: true } : { events: [trusted], ok: true };
  };
  const { labels, complete } = await collectLabels(request, { relays: ['wss://one.example'], labelers, targets: [target(0)], limit: 80 });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].until, undefined);
  assert.equal(calls[1].until, 99, 'the next page starts below the full page\u2019s oldest event');
  assert.equal(complete, 1);
  assert.deepEqual(labels, [trusted]);
});

test('collectLabels keeps previous trusted labels and drops untrusted ones, new and saved', async () => {
  const saved = label(labelers[0], 1, 90);
  const request = async () => ({ events: [label(stranger, 0)], ok: true });
  const { labels, complete } = await collectLabels(request, { relays: ['wss://one.example'], labelers, targets: [target(0)], previous: [saved, label(stranger, 2)], limit: 80 });
  assert.deepEqual(labels, [saved]);
  assert.equal(complete, 1);
});

test('collectLabels pages unequal relay histories independently and merges duplicate events', async () => {
  const newer = [label(labelers[0], 0, 100), label(labelers[0], 1, 90), label(labelers[0], 2, 80)];
  const older = label(labelers[0], 3, 10);
  const histories = { first: newer, second: [older], third: [newer[0]] };
  const calls = [];
  const request = async (url, filter) => {
    calls.push([url, filter.until]);
    return { events: histories[url].filter(event => event.created_at <= (filter.until ?? Infinity)).slice(0, filter.limit), ok: true };
  };
  const { labels, complete } = await collectLabels(request, { relays: Object.keys(histories), labelers, targets: [target(0)], limit: 2 });
  assert.deepEqual(labels.map(event => event.id).sort(), [...newer, older].map(event => event.id).sort());
  assert.deepEqual(calls.filter(([url]) => url === 'first'), [['first', undefined], ['first', 89]]);
  assert.equal(calls.filter(([url]) => url === 'second').length, 1);
  assert.equal(calls.filter(([url]) => url === 'third').length, 1);
  assert.equal(complete, 1);
});

test('collectLabels does not count an interrupted later page as a completed relay history', async () => {
  const previous = [label(labelers[0], 9)];
  const firstPage = [label(labelers[0], 0, 100), label(labelers[0], 1, 90)];
  const request = async (_url, filter) => ({ events: filter.until === undefined ? firstPage : [], ok: filter.until === undefined });
  const { labels, complete } = await collectLabels(request, { relays: ['first'], labelers, targets: [target(0)], previous, limit: 2 });
  assert.equal(complete, 0);
  assert.equal(labels.length, 3, 'partial results preserve previously saved labels');
});

test('collectLabels reports a pass no relay completed so the caller can keep the existing snapshot', async () => {
  const request = async () => ({ events: [], ok: false });
  const previous = [label(labelers[0], 3)];
  const { labels, complete, batches } = await collectLabels(request, { relays: ['wss://one.example'], labelers, targets: [target(0)], previous, limit: 80 });
  assert.equal(complete, 0);
  assert.equal(batches, 1);
  // The previous trusted labels survive a total failure; the script refuses to write without them.
  assert.deepEqual(labels, previous);
});

test('collectLabels without labelers or targets passes the previous trusted labels through', async () => {
  const request = async () => { throw new Error('no request may be made'); };
  const previous = [label(labelers[0], 4), label(stranger, 5)];
  // No labelers configured: an empty list trusts nobody, so saved labels are not carried.
  const empty = await collectLabels(request, { relays: ['wss://one.example'], labelers: [], targets: [target(0)], previous, limit: 80 });
  assert.deepEqual(empty, { labels: [], complete: 0, batches: 0 });
  const none = await collectLabels(request, { relays: ['wss://one.example'], labelers, targets: [], previous, limit: 80 });
  assert.deepEqual(none, { labels: [previous[0]], complete: 0, batches: 0 });
});
