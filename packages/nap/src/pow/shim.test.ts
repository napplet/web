import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface PostedMessage {
  msg: any;
  targetOrigin: string;
}

let postedMessages: PostedMessage[];
let uuidCounter: number;
let originalCryptoDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  postedMessages = [];
  uuidCounter = 0;
  originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      randomUUID: () => `pow-test-${++uuidCounter}`,
    },
  });

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      parent: {
        postMessage(msg: unknown, targetOrigin: string) {
          postedMessages.push({ msg, targetOrigin });
        },
      },
    },
  });

  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalCryptoDescriptor) {
    Object.defineProperty(globalThis, 'crypto', originalCryptoDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, 'crypto');
  }
  Reflect.deleteProperty(globalThis, 'window');
});

function lastPosted(type: string): any {
  for (let i = postedMessages.length - 1; i >= 0; i--) {
    if (postedMessages[i].msg?.type === type) return postedMessages[i].msg;
  }
  throw new Error(`no posted message of type ${type}`);
}

describe('@napplet/nap/pow shim', () => {
  it('posts pow.mine and resolves started/completed from shell pushes', async () => {
    const { mine, handlePowMessage } = await import('./shim.js');

    const job = mine({ kind: 1, content: 'gm', tags: [] }, 21, { workers: 4 });
    const sent = lastPosted('pow.mine');
    expect(sent).toMatchObject({
      id: 'pow-test-1',
      jobId: 'pow-test-2',
      template: { kind: 1, content: 'gm', tags: [] },
      target: 21,
      options: { workers: 4 },
    });
    expect(job.jobId).toBe('pow-test-2');

    const states: unknown[] = [];
    const progress: unknown[] = [];
    const done: unknown[] = [];
    job.on('state', (state) => states.push(state));
    job.on('progress', (p) => progress.push(p));
    job.on('done', (result) => done.push(result));

    handlePowMessage({
      type: 'pow.mine.result',
      id: sent.id,
      jobId: sent.jobId,
      accepted: true,
      state: 'queued',
      position: 0,
    });
    expect(states).toEqual([{ jobId: sent.jobId, state: 'queued', position: 0 }]);

    handlePowMessage({ type: 'pow.state', jobId: sent.jobId, state: 'mining' });
    await expect(job.started).resolves.toBeUndefined();

    const progressSnapshot = {
      jobId: sent.jobId,
      target: 21,
      state: 'mining',
      bestPow: 18,
      bestNonce: '773201',
      hashes: 2310000,
      hashRate: 412000,
      workers: [{ workerId: 0, bestPow: 18, hashes: 590000, hashRate: 104000 }],
      elapsedMs: 5600,
    };
    handlePowMessage({ type: 'pow.progress', jobId: sent.jobId, progress: progressSnapshot });
    expect(progress).toEqual([progressSnapshot]);

    const result = {
      jobId: sent.jobId,
      ok: true,
      event: {
        id: '000007abc',
        pubkey: 'f'.repeat(64),
        created_at: 1234567890,
        kind: 1,
        tags: [['nonce', '1099148', '21']],
        content: 'gm',
      },
      pow: 21,
      nonce: '1099148',
      hashes: 4980000,
      elapsedMs: 12100,
    };
    handlePowMessage({ type: 'pow.done', jobId: sent.jobId, result });
    await expect(job.completed).resolves.toEqual(result);
    expect(done).toEqual([result]);
  });

  it('rejects rejected jobs and emits an error listener payload', async () => {
    const { mineAndPublish, handlePowMessage } = await import('./shim.js');

    const job = mineAndPublish({ kind: 1, content: 'blocked' }, 99);
    const sent = lastPosted('pow.mineAndPublish');
    const errors: unknown[] = [];
    job.on('error', (error) => errors.push(error));

    handlePowMessage({
      type: 'pow.mineAndPublish.result',
      id: sent.id,
      jobId: sent.jobId,
      accepted: false,
      state: 'error',
      error: 'policy denied',
    });

    await expect(job.started).rejects.toThrow('policy denied');
    await expect(job.completed).rejects.toThrow('policy denied');
    expect(errors).toEqual([{ jobId: sent.jobId, error: 'policy denied' }]);
  });

  it('posts queue/job/hashrate/control requests and resolves their results', async () => {
    const {
      queue,
      job,
      hashrate,
      cancel,
      pause,
      resume,
      handlePowMessage,
    } = await import('./shim.js');

    const queuePromise = queue();
    const queueMsg = lastPosted('pow.queue');
    handlePowMessage({
      type: 'pow.queue.result',
      id: queueMsg.id,
      jobs: [{ jobId: 'job-1', target: 21, state: 'queued', priority: 0, bestPow: 0, hashRate: 0, kind: 1, mode: 'mine' }],
    });
    await expect(queuePromise).resolves.toHaveLength(1);

    const jobPromise = job('job-1');
    const jobMsg = lastPosted('pow.job');
    expect(jobMsg.jobId).toBe('job-1');
    handlePowMessage({
      type: 'pow.job.result',
      id: jobMsg.id,
      progress: { jobId: 'job-1', target: 21, state: 'mining', bestPow: 4, hashes: 10, hashRate: 2, workers: [], elapsedMs: 5 },
    });
    await expect(jobPromise).resolves.toMatchObject({ bestPow: 4 });

    const hashratePromise = hashrate();
    const hashrateMsg = lastPosted('pow.hashrate');
    handlePowMessage({
      type: 'pow.hashrate.result',
      id: hashrateMsg.id,
      hashrate: { hashRate: 1000, workers: 1, perWorker: [{ workerId: 0, hashRate: 1000 }], byJob: [{ jobId: 'job-1', hashRate: 1000 }] },
    });
    await expect(hashratePromise).resolves.toMatchObject({ workers: 1 });

    const cancelPromise = cancel('job-1');
    const cancelMsg = lastPosted('pow.cancel');
    handlePowMessage({ type: 'pow.cancel.result', id: cancelMsg.id, jobId: 'job-1', cancelled: true });
    await expect(cancelPromise).resolves.toBe(true);

    const pausePromise = pause();
    const pauseMsg = lastPosted('pow.pause');
    expect(pauseMsg.jobId).toBeUndefined();
    handlePowMessage({ type: 'pow.pause.result', id: pauseMsg.id });
    await expect(pausePromise).resolves.toBeUndefined();

    const resumePromise = resume('job-1');
    const resumeMsg = lastPosted('pow.resume');
    expect(resumeMsg.jobId).toBe('job-1');
    handlePowMessage({ type: 'pow.resume.result', id: resumeMsg.id, jobId: 'job-1' });
    await expect(resumePromise).resolves.toBeUndefined();
  });

  it('formats hash rates locally without posting a message', async () => {
    const { formatHashRate } = await import('./shim.js');

    expect(formatHashRate(999)).toBe('999 H/s');
    expect(formatHashRate(1500)).toBe('1.5 kH/s');
    expect(formatHashRate(2_400_000)).toBe('2.4 MH/s');
    expect(postedMessages).toHaveLength(0);
  });

  it('cleanup rejects pending jobs and clears state', async () => {
    const { installPowShim, mine } = await import('./shim.js');

    const cleanup = installPowShim();
    const powJob = mine({ kind: 1, content: 'pending' }, 21);
    cleanup();

    await expect(powJob.started).rejects.toThrow('pow shim uninstalled');
    await expect(powJob.completed).rejects.toThrow('pow shim uninstalled');
  });
});
