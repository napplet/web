/** Embedded NAP-SOULSEEK binding for the reference browser harness, without a Soulseek backend. */
export const SOULSEEK_PRELUDE_SOURCE = `
  if (domains.includes('soulseek')) {
    const soulseek = {};
    const methods = {
      info: [], search: ['request'], browse: ['username'], results: ['queryId', 'after', 'limit'], stop: ['queryId'],
      download: ['fileId'], transfers: [], status: ['transferId'], pause: ['transferId'], resume: ['transferId'],
      cancel: ['transferId'], read: ['transferId', 'offset', 'length'], save: ['transferId'], release: ['kind', 'handle'],
    };
    for (const [method, fields] of Object.entries(methods)) {
      soulseek[method] = (...args) => {
        const type = 'soulseek.' + method;
        const payload = { type };
        fields.forEach((field, index) => { if (args[index] !== undefined) payload[field] = args[index]; });
        return request(payload, type + '.result').then((message) => {
          const hasValue = message.value !== undefined && message.value !== null;
          const hasError = message.error !== undefined && message.error !== null;
          if (hasValue === hasError) throw new Error(type + '.result must carry exactly one of value or error');
          if (hasError) {
            const failure = new Error(String(message.error.message));
            failure.name = 'SoulseekError';
            failure.code = message.error.code;
            throw failure;
          }
          return message.value;
        });
      };
    }
    napplet.soulseek = soulseek;
  }
`;
