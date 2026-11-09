import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { withWebFixture } from './lib/web-fixture-workspace.mjs';

async function checkout(t, name) {
  const root = await mkdtemp(join(tmpdir(), 'napplet-workspace-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const dir of ['src/data', 'dist', 'node_modules/package', 'node_modules/.vite']) await mkdir(join(root, dir), { recursive: true });
  await writeFile(join(root, 'src/data/discovery.json'), `${name} discovery`);
  await writeFile(join(root, 'src/data/discovered-apps.json'), `${name} snapshot`);
  await writeFile(join(root, 'dist/index.html'), `${name} production`);
  await writeFile(join(root, 'node_modules/.vite/original'), 'production cache');
  return root;
}

test('concurrent runs from the same and different checkouts have isolated data, output and caches', async t => {
  const first = await checkout(t, 'first');
  const second = await checkout(t, 'second');
  const roots = [];
  let ready = 0;
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  await Promise.all([first, first, second].map((source, index) => withWebFixture(source, async root => {
    roots.push(root);
    await writeFile(join(root, 'src/data/discovery.json'), `fixture ${index}`);
    await writeFile(join(root, 'src/data/discovered-apps.json'), `snapshot ${index}`);
    await mkdir(join(root, 'dist'));
    await writeFile(join(root, 'dist/index.html'), `output ${index}`);
    await mkdir(join(root, 'node_modules/.vite'));
    await writeFile(join(root, 'node_modules/.vite/original'), `cache ${index}`);
    if (++ready === 3) release();
    await barrier;
    assert.equal(await readFile(join(root, 'src/data/discovery.json'), 'utf8'), `fixture ${index}`);
    assert.equal(await readFile(join(root, 'src/data/discovered-apps.json'), 'utf8'), `snapshot ${index}`);
    assert.equal(await readFile(join(root, 'dist/index.html'), 'utf8'), `output ${index}`);
    assert.equal(await readFile(join(root, 'node_modules/.vite/original'), 'utf8'), `cache ${index}`);
  })));
  assert.equal(new Set(roots).size, 3);
  for (const [source, name] of [[first, 'first'], [second, 'second']]) {
    assert.equal(await readFile(join(source, 'src/data/discovery.json'), 'utf8'), `${name} discovery`);
    assert.equal(await readFile(join(source, 'src/data/discovered-apps.json'), 'utf8'), `${name} snapshot`);
    assert.equal(await readFile(join(source, 'dist/index.html'), 'utf8'), `${name} production`);
    assert.equal(await readFile(join(source, 'node_modules/.vite/original'), 'utf8'), 'production cache');
  }
  for (const root of roots) await assert.rejects(readFile(join(root, 'src/data/discovery.json')), { code: 'ENOENT' });
});

test('a failed second fixture write cannot alter checkout data and cleans the temporary copy', async t => {
  const source = await checkout(t, 'original');
  let copied;
  await assert.rejects(withWebFixture(source, async root => {
    copied = root;
    await writeFile(join(root, 'src/data/discovery.json'), 'fixture');
    await rm(join(root, 'src/data/discovered-apps.json'));
    await mkdir(join(root, 'src/data/discovered-apps.json'));
    await writeFile(join(root, 'src/data/discovered-apps.json'), 'fixture');
  }), { code: 'EISDIR' });
  assert.equal(await readFile(join(source, 'src/data/discovery.json'), 'utf8'), 'original discovery');
  assert.equal(await readFile(join(source, 'src/data/discovered-apps.json'), 'utf8'), 'original snapshot');
  await assert.rejects(readFile(join(copied, 'src/data/discovery.json')), { code: 'ENOENT' });
});

test('a startup failure after both fixture writes leaves production data and output intact', async t => {
  const source = await checkout(t, 'original');
  let copied;
  await assert.rejects(withWebFixture(source, async root => {
    copied = root;
    await writeFile(join(root, 'src/data/discovery.json'), 'fixture');
    await writeFile(join(root, 'src/data/discovered-apps.json'), 'fixture');
    throw new Error('browser launch failed');
  }), /browser launch failed/);
  assert.equal(await readFile(join(source, 'src/data/discovery.json'), 'utf8'), 'original discovery');
  assert.equal(await readFile(join(source, 'src/data/discovered-apps.json'), 'utf8'), 'original snapshot');
  assert.equal(await readFile(join(source, 'dist/index.html'), 'utf8'), 'original production');
  await assert.rejects(readFile(join(copied, 'src/data/discovery.json')), { code: 'ENOENT' });
});
