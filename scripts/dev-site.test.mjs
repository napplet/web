import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import test from 'node:test';
import { startSite } from './dev-site.mjs';

test('paired launches bind distinct available ports and close every listener', async (t) => {
  const servers = [];
  const previous = process.env.NAPPLET_DOCS_ORIGIN;
  t.after(() => {
    if (previous === undefined) delete process.env.NAPPLET_DOCS_ORIGIN;
    else process.env.NAPPLET_DOCS_ORIGIN = previous;
    for (const server of servers) server.close();
  });
  const apis = {
    docs: { createServer: async (_root, options) => {
      const httpServer = createServer((_req, res) => res.end('docs'));
      servers.push(httpServer);
      return {
        httpServer,
        async listen() { httpServer.listen(options.port, options.host); await once(httpServer, 'listening'); },
        close: () => new Promise((resolve, reject) => httpServer.close((error) => error ? reject(error) : resolve())),
      };
    } },
    web: { dev: async ({ server: options, vite }) => {
      const origin = vite.server.proxy['/docs'].target;
      const server = createServer((_req, res) => res.end(origin));
      servers.push(server);
      server.listen(options.port, options.host);
      await once(server, 'listening');
      return {
        address: server.address(),
        stop: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
      };
    } },
  };
  const first = await startSite(apis);
  const second = await startSite(apis);
  const urls = [first.webUrl, first.docsUrl, second.webUrl, second.docsUrl];
  assert.equal(new Set(urls.map((url) => new URL(url).port)).size, 4);
  for (const site of [first, second]) {
    assert.equal(await (await fetch(site.webUrl)).text(), new URL(site.docsUrl).origin);
    assert.equal(await (await fetch(site.docsUrl)).text(), 'docs');
    await site.stop();
  }
  assert.ok(servers.every((server) => !server.listening));
});

test('a website startup failure closes the documentation server', async () => {
  let closed = false;
  const previous = process.env.NAPPLET_DOCS_ORIGIN;
  try {
    await assert.rejects(startSite({
      docs: { createServer: async () => ({
        listen: async () => {}, httpServer: { address: () => ({ port: 62137 }) },
        close: async () => { closed = true; },
      }) },
      web: { dev: async () => { throw new Error('website config error'); } },
    }), /website config error/);
    assert.equal(closed, true);
  } finally {
    if (previous === undefined) delete process.env.NAPPLET_DOCS_ORIGIN;
    else process.env.NAPPLET_DOCS_ORIGIN = previous;
  }
});

test('startup preserves the original error when cleanup also fails', async () => {
  const previous = process.env.NAPPLET_DOCS_ORIGIN;
  try {
    await assert.rejects(startSite({
      docs: { createServer: async () => ({
        listen: async () => {}, httpServer: { address: () => ({ port: 62137 }) },
        close: async () => { throw new Error('docs cleanup error'); },
      }) },
      web: { dev: async () => { throw new Error('website config error'); } },
    }), (error) => {
      assert.ok(error instanceof AggregateError);
      assert.match(error.errors[0].message, /website config error/);
      assert.match(error.errors[1].errors[0].message, /docs cleanup error/);
      return true;
    });
  } finally {
    if (previous === undefined) delete process.env.NAPPLET_DOCS_ORIGIN;
    else process.env.NAPPLET_DOCS_ORIGIN = previous;
  }
});


test('standalone docs do not start a website or assume a fixed port', async () => {
  const previous = process.env.NAPPLET_DOCS_ORIGIN;
  let requested;
  const httpServer = createServer((_req, res) => res.end('standalone docs'));
  try {
    const site = await startSite({ docs: { createServer: async (_root, options) => {
      requested = options.port;
      return { httpServer,
        async listen() { httpServer.listen(options.port, options.host); await once(httpServer, 'listening'); },
        close: () => new Promise(resolve => httpServer.close(resolve)),
      };
    } }, web: { dev: () => assert.fail('standalone docs started a website') } }, 'docs');
    assert.ok(Number.isInteger(requested) && requested > 0);
    assert.equal(site.webUrl, undefined);
    assert.equal(await (await fetch(site.docsUrl)).text(), 'standalone docs');
    await site.stop();
    assert.equal(httpServer.listening, false);
  } finally {
    httpServer.close();
    if (previous === undefined) delete process.env.NAPPLET_DOCS_ORIGIN;
    else process.env.NAPPLET_DOCS_ORIGIN = previous;
  }
});
