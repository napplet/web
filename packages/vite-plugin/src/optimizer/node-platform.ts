/** Node terminal, credential-process, DNS, filesystem, and pinned HTTPS adapters. */

import { RedactedSecret } from '@napplet/build-tools';
import { isIP, type LookupFunction } from 'node:net';
import type {
  Clock,
  FileSystemAdapter,
  ProcessAdapter,
  PublicAddressResolver,
  SafeStatus,
  TerminalAdapter,
  ValidatedEndpoint,
} from '@napplet/build-tools';

const MAX_PINNED_RESPONSE_BYTES = 64 * 1024;

export function nodeClock(): Clock {
  return {
    now: () => Date.now(),
    setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
    clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  };
}

export function defaultInteractive(): boolean {
  return process.stdin.isTTY === true && process.stdout.isTTY === true;
}

export function nodeTerminal(renderQr: (uri: string) => Promise<string>): TerminalAdapter {
  return {
    async showQr(uri: string): Promise<void> {
      process.stdout.write(`${await renderQr(uri)}\n`);
      process.stdout.write('Scan the QR with a NIP-46 signer, or paste a bunker:// URL.\n');
    },
    readLine(prompt: string, signal: AbortSignal): Promise<string> {
      return new Promise((resolve, reject) => {
        void import('node:readline').then(({ createInterface }) => {
          if (signal.aborted) {
            reject(new Error('terminal input cancelled'));
            return;
          }
          const reader = createInterface({ input: process.stdin, output: process.stderr });
          const abort = () => {
            reader.close();
            reject(new Error('terminal input cancelled'));
          };
          signal.addEventListener('abort', abort, { once: true });
          reader.question(prompt, (value) => {
            signal.removeEventListener('abort', abort);
            reader.close();
            resolve(value);
          });
        }).catch(() => reject(new Error('terminal input is unavailable')));
      });
    },
    writeStatus(status: SafeStatus): void {
      process.stderr.write(`${status.message}\n`);
    },
  };
}

export async function renderTerminalQr(uri: string): Promise<string> {
  const qrcode = await import('qrcode');
  return await qrcode.default.toString(uri, { type: 'terminal', small: true });
}

export function nodeProcess(): ProcessAdapter {
  return {
    async run(command, args, input): Promise<{ code: number; stdout: string; stderr: string }> {
      const { spawn } = await import('node:child_process');
      const opaqueArgs = args.map((argument) => argument instanceof RedactedSecret ? argument.withValue((value) => value) : argument);
      return await new Promise((resolve) => {
        const child = spawn(command, opaqueArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
        const output: Uint8Array[] = [];
        const errors: Uint8Array[] = [];
        child.stdout.on('data', (value: Uint8Array) => output.push(value));
        child.stderr.on('data', (value: Uint8Array) => errors.push(value));
        child.once('error', () => resolve({ code: 1, stdout: '', stderr: '' }));
        child.once('close', (code) => resolve({
          code: code ?? 1,
          stdout: Buffer.concat(output).toString('utf8'),
          stderr: Buffer.concat(errors).toString('utf8'),
        }));
        if (input) input.withValue((value) => child.stdin.end(value));
        else child.stdin.end();
      });
    },
  };
}

export function nodeFileSystem(): FileSystemAdapter {
  return {
    async readText(path: string): Promise<string> {
      const fs = await import('node:fs/promises');
      return await fs.readFile(path, 'utf8');
    },
    async writeText(path: string, contents: string): Promise<void> {
      const fs = await import('node:fs/promises');
      await fs.writeFile(path, contents, 'utf8');
    },
    async exists(path: string): Promise<boolean> {
      const fs = await import('node:fs/promises');
      return await fs.access(path).then(() => true, () => false);
    },
  };
}

export function nodeResolver(): PublicAddressResolver['resolve'] {
  return async (hostname, signal) => {
    if (signal.aborted) throw new Error('DNS resolution cancelled');
    const { Resolver } = await import('node:dns/promises');
    const resolver = new Resolver();
    const cancel = () => resolver.cancel();
    signal.addEventListener('abort', cancel, { once: true });
    try {
      const [v4, v6] = await Promise.allSettled([resolver.resolve4(hostname), resolver.resolve6(hostname)]);
      if (signal.aborted) throw new Error('DNS resolution cancelled');
      const answers = [
        ...(v4.status === 'fulfilled' ? v4.value : []),
        ...(v6.status === 'fulfilled' ? v6.value : []),
      ];
      if (answers.length === 0) throw new Error('DNS resolution failed');
      return answers;
    } finally {
      signal.removeEventListener('abort', cancel);
      resolver.cancel();
    }
  };
}

/**
 * Create a fail-closed Node lookup backed only by validated addresses.
 *
 * @param addresses - Addresses previously accepted by the endpoint network policy.
 * @returns A Node lookup callback that supports single-result and all-result callers.
 * @example
 * const lookup = _createPinnedLookup(['192.0.2.1']);
 * @internal
 */
export function _createPinnedLookup(addresses: readonly string[]): LookupFunction {
  if (addresses.length === 0) throw new Error('Pinned HTTPS endpoint has no address');
  const records = addresses.map((address) => {
    const family = isIP(address);
    if (family === 0) throw new Error('Pinned HTTPS endpoint has an invalid address');
    return { address, family };
  });

  return (_hostname, options, callback) => {
    if (options.all === true) {
      callback(null, records);
      return;
    }
    const first = records[0];
    callback(null, first.address, first.family);
  };
}

export async function nodePinnedFetch(endpoint: ValidatedEndpoint, init: RequestInit): Promise<Response> {
  const { request } = await import('node:https');
  const lookup = _createPinnedLookup(endpoint.addresses);
  const headers = Object.fromEntries(new Headers(init.headers).entries());
  return await new Promise<Response>((resolve, reject) => {
    let settled = false;
    const fail = (error: Error): void => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const operation = request(endpoint.url, {
      method: init.method,
      headers,
      signal: init.signal ?? undefined,
      servername: endpoint.hostname,
      lookup,
    }, (incoming) => {
      const chunks: Uint8Array[] = [];
      let total = 0;
      incoming.on('data', (chunk: Uint8Array) => {
        total += chunk.byteLength;
        if (total > MAX_PINNED_RESPONSE_BYTES) {
          const error = new Error('Pinned HTTPS response exceeded limit');
          fail(error);
          operation.destroy(error);
          return;
        }
        chunks.push(chunk);
      });
      incoming.once('error', fail);
      incoming.once('end', () => {
        if (settled) return;
        const responseHeaders = new Headers();
        for (const [name, value] of Object.entries(incoming.headers)) {
          if (Array.isArray(value)) value.forEach((item) => responseHeaders.append(name, item));
          else if (value !== undefined) responseHeaders.set(name, value);
        }
        const status = incoming.statusCode ?? 500;
        const body = init.method === 'HEAD' || status === 204 || status === 304
          ? null
          : Buffer.concat(chunks);
        settled = true;
        resolve(new Response(body, { status, statusText: incoming.statusMessage, headers: responseHeaders }));
      });
    });
    operation.once('error', fail);
    void writeRequestBody(operation, init.body).catch((error) => operation.destroy(error as Error));
  });
}

async function writeRequestBody(
  request: import('node:http').ClientRequest,
  body: RequestInit['body'],
): Promise<void> {
  if (body === undefined || body === null) {
    request.end();
    return;
  }
  if (body instanceof Blob) {
    request.end(Buffer.from(await body.arrayBuffer()));
    return;
  }
  if (typeof body === 'string' || body instanceof Uint8Array) {
    request.end(body);
    return;
  }
  throw new Error('Pinned HTTPS transport received an unsupported request body');
}
