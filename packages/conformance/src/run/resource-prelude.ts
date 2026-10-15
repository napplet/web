/** Resource methods injected by the conformance harness; request correlation is owned by boot. */
export const RESOURCE_METHODS_SOURCE = `
napplet.resource.info = () =>
  request({ type: 'resource.info' }, 'resource.info.result', 'resource.info.error')
    .then((msg) => msg.info);
const decodeBlob = (value, mime) => {
  if (typeof value !== 'string' || typeof mime !== 'string' || value.length % 4 !== 0) throw new Error('decode-failed: invalid resource bytes or MIME');
  let binary;
  try { binary = atob(value); } catch { throw new Error('decode-failed: invalid resource base64'); }
  if (btoa(binary) !== value) throw new Error('decode-failed: non-canonical resource base64');
  return new Blob([Uint8Array.from(binary, (character) => character.charCodeAt(0))], { type: mime });
};
const resourceRequest = (message, options) => {
  const signal = options && options.signal;
  if (signal && signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  const id = nextId();
  const work = request({ ...message, id }, message.type + '.result', message.type + '.error');
  if (!signal) return work;
  const abort = () => {
    const slot = pending.get(id);
    if (!slot) return;
    pending.delete(id);
    window.clearTimeout(slot.timeout);
    window.parent.postMessage({ type: 'resource.cancel', id }, '*');
    slot.reject(new DOMException('Aborted', 'AbortError'));
  };
  signal.addEventListener('abort', abort, { once: true });
  return work.finally(() => signal.removeEventListener('abort', abort));
};
napplet.resource.bytes = (url, options) =>
  resourceRequest({ type: 'resource.bytes', url }, options).then((msg) => decodeBlob(msg.blob, msg.mime));
napplet.resource.bytesMany = (urls, options) => {
  if (!Array.isArray(urls) || !urls.length || Array.from(urls).some((url) => typeof url !== 'string')) return Promise.reject(new Error('invalid-request: urls must be a non-empty string array'));
  const expected = Array.from(urls);
  return resourceRequest({ type: 'resource.bytesMany', urls: expected }, options).then((msg) => {
    if (!Array.isArray(msg.items) || msg.items.length !== expected.length) throw new Error('decode-failed: resource result length mismatch');
    return Array.from(msg.items, (item, index) => {
      if (!item || item.url !== expected[index] || typeof item.ok !== 'boolean') throw new Error('decode-failed: resource result order or shape mismatch');
      if (item.ok) return { ...item, blob: decodeBlob(item.blob, item.mime) };
      if (typeof item.error !== 'string' || 'blob' in item) throw new Error('decode-failed: invalid resource error item');
      return item;
    });
  });
};
napplet.resource.bytesAsObjectURL = (url) => {
  const handle = { url: '', revoke: () => {} };
  let objectUrl = '';
  let revoked = false;
  const ready = napplet.resource.bytes(url).then((blob) => {
    if (revoked) return;
    objectUrl = URL.createObjectURL(blob);
    handle.url = objectUrl;
    return objectUrl;
  });
  handle.revoke = () => {
    if (revoked) return;
    revoked = true;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  };
  Object.defineProperty(handle, 'ready', { value: ready, enumerable: false });
  return handle;
};
`;
