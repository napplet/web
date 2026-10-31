/** Embedded NAP-LLM binding for the reference browser harness, without a provider. */
export const LLM_PRELUDE_SOURCE = `
  if (domains.includes('llm')) {
    const llmFields = { 'llm.select.result': 'model', 'llm.describe.result': 'model', 'llm.generate.result': 'result', 'llm.cancel.result': 'cancelled' };
    const llmDeltas = new Map();
    window.addEventListener('message', (event) => {
      if (event.source !== window.parent) return;
      const msg = event.data;
      if (!msg || typeof msg !== 'object' || msg.type !== 'llm.delta' || 'id' in msg || typeof msg.requestId !== 'string') return;
      const entry = llmDeltas.get(msg.requestId);
      if (!entry || typeof msg.sequence !== 'number' || typeof msg.text !== 'string') return;
      if (msg.sequence !== entry.next) { entry.next = Infinity; return; }
      entry.next += 1;
      if (entry.onDelta) entry.onDelta({ requestId: msg.requestId, sequence: msg.sequence, text: msg.text });
    });
    const llmRequest = (payload, id) => {
      const type = payload.type;
      return request(id === undefined ? payload : { ...payload, id }, type + '.result').then((message) => {
        const field = llmFields[message.type];
        const hasValue = message[field] !== undefined && message[field] !== null;
        const hasError = message.error !== undefined && message.error !== null;
        if (hasValue === hasError) throw new Error(type + '.result must carry exactly one of ' + field + ' or error');
        if (hasError) {
          const failure = new Error(String(message.error.message));
          failure.name = 'LlmError';
          failure.code = message.error.code;
          throw failure;
        }
        return message[field];
      });
    };
    napplet.llm = {
      select: (requirements) => llmRequest(requirements === undefined ? { type: 'llm.select' } : { type: 'llm.select', requirements }),
      describe: (handle) => llmRequest({ type: 'llm.describe', handle }),
      generate: (generation, options) => {
        const id = nextId();
        const entry = { next: 0, onDelta: options && options.onDelta };
        llmDeltas.set(id, entry);
        const signal = options && options.signal;
        const abort = () => { napplet.llm.cancel(id).catch(() => undefined); };
        if (signal) { if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true }); }
        const pendingGeneration = llmRequest({ type: 'llm.generate', request: generation }, id).finally(() => {
          llmDeltas.delete(id);
          if (signal) signal.removeEventListener('abort', abort);
        });
        return Object.assign(pendingGeneration, { requestId: id });
      },
      cancel: (requestId) => llmRequest({ type: 'llm.cancel', requestId }),
    };
  }
`;
