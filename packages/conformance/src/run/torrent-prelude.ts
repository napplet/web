/** Embedded NAP-TORRENT binding for the reference browser harness, without a torrent engine. */
export const TORRENT_PRELUDE_SOURCE = `
  if (domains.includes('torrent')) {
    const torrent = {};
    const methods = {
      capabilities: [[], 'capabilities'], pickFiles: [['options'], 'result'], add: [['request'], 'ack'],
      status: [['jobId'], 'status'], jobs: [['filter'], 'jobs'], files: [['jobId'], 'files'],
      selectFiles: [['jobId', 'selection'], 'status'], pause: [['jobId'], 'status'], resume: [['jobId'], 'status'],
      remove: [['jobId', 'options'], 'result'], metadata: [['jobId'], 'result'], read: [['request'], 'result'],
      exportMetainfo: [['jobId'], 'result'], saveFile: [['jobId', 'fileIndex'], 'result'],
      openFile: [['jobId', 'fileIndex'], 'result'], cancel: [['requestId'], 'result'], update: [['request'], 'result'],
    };
    for (const [method, [fields, result]] of Object.entries(methods)) {
      torrent[method] = (...args) => {
        const type = 'torrent.' + method;
        const payload = { type };
        fields.forEach((field, index) => { if (args[index] !== undefined) payload[field] = args[index]; });
        const cancellable = ['read', 'exportMetainfo', 'saveFile'].includes(method);
        const wait = method === 'read' ? Math.min(30000, Math.max(0, Number(args[0]?.waitMs) || 0)) : 0;
        const raw = request(payload, type + '.result', undefined, 30000 + wait,
          { cancellable, cancelTargetId: method === 'cancel' ? args[0] : undefined });
        const response = raw.then((message) => {
          if (typeof message.error === 'string') throw new Error(message.error);
          if (message[result] === undefined) throw new Error(type + ' returned no ' + result);
          return message[result];
        });
        if (cancellable) Object.defineProperty(response, 'requestId', { value: raw.requestId });
        return response;
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
