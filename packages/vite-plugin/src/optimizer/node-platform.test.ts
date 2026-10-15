import { createServer } from 'node:https';
import type { LookupAddress } from 'node:dns';
import { describe, expect, it } from 'vitest';
import { _createPinnedLookup, nodePinnedFetch } from './node-platform.js';

const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQguLe9WNFXlAiluQMx
IJR+jhmA6RIrdIJkmPoO54NmRzShRANCAASIiMs/X+sRuX519HpHSsCK/N/LvR8/
/3nhOEuvKH4FxjOAC4dSzzQCSsTla/oMOLu7Ql3TuXjtHA+/acw8cFdd
-----END PRIVATE KEY-----`;

const CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIBfDCCASOgAwIBAgIUSrR4ca3YWnlcrxHrGkmOOselhkIwCgYIKoZIzj0EAwIw
FDESMBAGA1UEAwwJbG9jYWxob3N0MB4XDTI2MDkwNDEwNDAzMVoXDTI2MDkwNjEw
NDAzMVowFDESMBAGA1UEAwwJbG9jYWxob3N0MFkwEwYHKoZIzj0CAQYIKoZIzj0D
AQcDQgAEiIjLP1/rEbl+dfR6R0rAivzfy70fP/954ThLryh+BcYzgAuHUs80AkrE
5Wv6DDi7u0Jd07l47RwPv2nMPHBXXaNTMFEwHQYDVR0OBBYEFNH5Lv4S3khhCPX+
JXtv5xgpBOY5MB8GA1UdIwQYMBaAFNH5Lv4S3khhCPX+JXtv5xgpBOY5MA8GA1Ud
EwEB/wQFMAMBAf8wCgYIKoZIzj0EAwIDRwAwRAIgET6wQuy9Kpb+1HEcwnX2AWHq
Eke6nt6dWsdTKrUZWbICIED7mcGr6le1omAUOlgDUgJ0dg0ENjfyRxjsALX0mMnu
-----END CERTIFICATE-----`;

describe('nodePinnedFetch', () => {
  it('returns every validated address when Node requests all results', async () => {
    const lookup = _createPinnedLookup(['2001:db8::1', '192.0.2.1']);
    const result = await new Promise<LookupAddress[]>((resolve, reject) => {
      lookup('ignored.example', { all: true }, (error, addresses) => {
        if (error) reject(error);
        else resolve(addresses as LookupAddress[]);
      });
    });

    expect(result).toEqual([
      { address: '2001:db8::1', family: 6 },
      { address: '192.0.2.1', family: 4 },
    ]);
  });

  it('returns the first validated address through the single-result callback shape', async () => {
    const lookup = _createPinnedLookup(['192.0.2.1', '2001:db8::1']);
    const result = await new Promise<{ address: string; family: number }>((resolve, reject) => {
      lookup('ignored.example', { all: false }, (error, address, family) => {
        if (error) reject(error);
        else resolve({ address: address as string, family: family ?? 0 });
      });
    });

    expect(result).toEqual({ address: '192.0.2.1', family: 4 });
  });

  it('rejects missing and malformed validated address lists', () => {
    expect(() => _createPinnedLookup([])).toThrow('Pinned HTTPS endpoint has no address');
    expect(() => _createPinnedLookup(['not-an-ip'])).toThrow('Pinned HTTPS endpoint has an invalid address');
  });

  it('completes through the real Node HTTPS request path', async () => {
    const server = createServer({ key: PRIVATE_KEY, cert: CERTIFICATE }, (_request, response) => {
      response.writeHead(200, { 'content-type': 'text/plain' });
      response.end('pinned response');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('HTTPS fixture did not bind to TCP');

    const previousTlsSetting = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
      const response = await nodePinnedFetch({
        url: new URL(`https://localhost:${address.port}/resource`),
        hostname: 'localhost',
        addresses: ['127.0.0.1'],
      }, { method: 'GET' });

      expect(response.status).toBe(200);
      await expect(response.text()).resolves.toBe('pinned response');
    } finally {
      if (previousTlsSetting === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      else process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousTlsSetting;
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
