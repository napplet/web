/** Embedded NAP-TORRENT binding for the reference browser harness, without a torrent engine. */
export const TORRENT_PRELUDE_SOURCE = `
  if (domains.includes('torrent')) {
    const torrent = {};
    const methods = {
      capabilities: [[], 'capabilities'], fromEvent: [['event'], 'result'], toMagnet: [['descriptor'], 'result'],
      search: [['query'], 'results'], publish: [['request'], 'result'], comment: [['request'], 'result'],
      pickFiles: [['options'], 'result'], add: [['request'], 'ack'], status: [['jobId'], 'status'],
      jobs: [['filter'], 'jobs'], files: [['jobId'], 'files'], selectFiles: [['jobId', 'selection'], 'status'],
      pause: [['jobId'], 'status'], resume: [['jobId'], 'status'], remove: [['jobId', 'options'], 'result'],
    };
    for (const [method, [fields, result]] of Object.entries(methods)) {
      torrent[method] = (...args) => {
        const type = 'torrent.' + method;
        const payload = { type };
        fields.forEach((field, index) => { if (args[index] !== undefined) payload[field] = args[index]; });
        return request(payload, type + '.result').then((message) => {
          if (typeof message.error === 'string') throw new Error(message.error);
          if (message[result] === undefined) throw new Error(type + ' returned no ' + result);
          return message[result];
        });
      };
    }
    const handlers = { state: new Set(), progress: new Set(), error: new Set() };
    for (const [kind, method] of [['state', 'onState'], ['progress', 'onProgress'], ['error', 'onError']]) {
      torrent[method] = (handler) => {
        const entry = { handler };
        handlers[kind].add(entry);
        return { close() { handlers[kind].delete(entry); } };
      };
    }
    window.addEventListener('message', (event) => {
      if (event.source !== window.parent) return;
      const message = event.data;
      if (!message || typeof message !== 'object' || 'id' in message || typeof message.jobId !== 'string') return;
      const kind = { 'torrent.state': 'state', 'torrent.progress': 'progress', 'torrent.error': 'error' }[message.type];
      if (!kind) return;
      if (kind === 'state' && typeof message.state !== 'string') return;
      if (kind === 'progress' && (!message.status || typeof message.status !== 'object')) return;
      if (kind === 'error' && typeof message.error !== 'string') return;
      const { type, ...payload } = message;
      for (const entry of Array.from(handlers[kind])) {
        if (!handlers[kind].has(entry)) continue;
        try { entry.handler(payload); } catch (error) { queueMicrotask(() => { throw error; }); }
      }
    });
    napplet.torrent = torrent;
  }
`;
