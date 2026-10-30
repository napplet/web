/**
 * Literal browser source keeps the fallback independent of bundler transforms.
 * Parity tests compare these helpers with the maintained NAP-MOTION binding.
 */
export const MOTION_STATE_TOOLS_SOURCE = `(() => {
  const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const finite = (value) => typeof value === 'number' && Number.isFinite(value);
  const permission = (value) => ['prompt', 'granted', 'denied'].includes(value);
  const nullableNumber = (value, min = -Infinity, max = Infinity) => value === null || (finite(value) && value >= min && value <= max);
  const vector = (value, keys) => value === null || (record(value) && keys.every((key) => nullableNumber(value[key])));
  const orientation = (value) => value === null || (record(value) && typeof value.absolute === 'boolean'
    && nullableNumber(value.alpha, 0, 360) && nullableNumber(value.beta, -180, 180) && nullableNumber(value.gamma, -90, 90));
  const isMotionState = (value) => {
    if (!record(value) || typeof value.available !== 'boolean' || !permission(value.permission)) return false;
    if (typeof value.absolute !== 'boolean' || typeof value.focused !== 'boolean') return false;
    if (!finite(value.frequency) || value.frequency < 0) return false;
    if (value.available ? value.reason !== undefined : value.reason !== 'blocked' && value.reason !== 'unavailable') return false;
    if (value.focused && (!value.available || value.permission !== 'granted' || value.frequency === 0)) return false;
    if (!value.focused && value.frequency !== 0) return false;
    return !value.absolute || value.permission === 'granted';
  };
  const isMotionSample = (value) => record(value) && finite(value.timestamp) && finite(value.interval) && value.interval >= 0
    && vector(value.acceleration, ['x', 'y', 'z']) && vector(value.accelerationIncludingGravity, ['x', 'y', 'z'])
    && vector(value.rotationRate, ['alpha', 'beta', 'gamma']) && orientation(value.orientation);
  const isMotionPermissionResult = (value) => {
    if (!record(value) || !permission(value.permission) || typeof value.absolute !== 'boolean') return false;
    if (value.error !== undefined && typeof value.error !== 'string') return false;
    if (value.permission === 'prompt' && value.error === undefined) return false;
    return !value.absolute || value.permission === 'granted';
  };
  const copyMotionState = (value) => ({
    available: value.available, permission: value.permission, absolute: value.absolute,
    focused: value.focused, frequency: value.frequency,
    ...(value.reason === undefined ? {} : { reason: value.reason }),
  });
  const copyMotionSample = (value) => ({
    timestamp: value.timestamp, interval: value.interval,
    acceleration: value.acceleration === null ? null : { x: value.acceleration.x, y: value.acceleration.y, z: value.acceleration.z },
    accelerationIncludingGravity: value.accelerationIncludingGravity === null ? null : {
      x: value.accelerationIncludingGravity.x, y: value.accelerationIncludingGravity.y, z: value.accelerationIncludingGravity.z,
    },
    rotationRate: value.rotationRate === null ? null : {
      alpha: value.rotationRate.alpha, beta: value.rotationRate.beta, gamma: value.rotationRate.gamma,
    },
    orientation: value.orientation === null ? null : {
      alpha: value.orientation.alpha, beta: value.orientation.beta, gamma: value.orientation.gamma, absolute: value.orientation.absolute,
    },
  });
  return { isMotionState, isMotionSample, isMotionPermissionResult, copyMotionState, copyMotionSample };
})()`;

/** Install the complete optional motion fixture inside the fallback closure. */
export const MOTION_RUNTIME_SOURCE = `
if (domains.includes('motion')) {
  const tools = ${MOTION_STATE_TOOLS_SOURCE};
  let state = { available: true, permission: 'prompt', absolute: false, focused: false, frequency: 0 };
  let latest = null;
  let subscribed = false;
  let disposed = false;
  const states = new Set();
  const samples = new Set();
  const requests = new Map();
  const subscribe = () => {
    if (subscribed || disposed) return;
    subscribed = true;
    try { window.parent.postMessage({ type: 'motion.subscribe' }, '*'); }
    catch (error) { subscribed = false; throw error; }
  };
  const notify = (handlers, value, copy) => {
    for (const entry of Array.from(handlers)) {
      if (!handlers.has(entry)) continue;
      try { entry.handler(copy(value)); }
      catch (error) { queueMicrotask(() => { throw error; }); }
    }
  };
  const on = (handlers, handler) => {
    const entry = { handler };
    handlers.add(entry);
    try { subscribe(); } catch (error) { handlers.delete(entry); throw error; }
    return { close() { handlers.delete(entry); } };
  };
  const receive = (event) => {
    if (event.source !== window.parent || !subscribed || disposed) return;
    const message = event.data;
    if (!message || typeof message !== 'object' || Array.isArray(message)) return;
    if (message.type === 'motion.state' && !('id' in message) && tools.isMotionState(message)) {
      state = tools.copyMotionState(message);
      if (!state.focused || !state.available || state.permission !== 'granted' || (latest && latest.orientation && latest.orientation.absolute && !state.absolute)) latest = null;
      notify(states, state, tools.copyMotionState);
    } else if (message.type === 'motion.sample' && !('id' in message) && tools.isMotionSample(message)) {
      if (!state.available || !state.focused || state.permission !== 'granted') return;
      if (message.orientation && message.orientation.absolute && !state.absolute) return;
      latest = tools.copyMotionSample(message);
      notify(samples, latest, tools.copyMotionSample);
    } else if (message.type === 'motion.permission.result' && tools.isMotionPermissionResult(message)) {
      const slot = requests.get(message.id);
      if (!slot) return;
      requests.delete(message.id);
      window.clearTimeout(slot.timeout);
      slot.resolve({ permission: message.permission, absolute: message.absolute,
        ...(message.error === undefined ? {} : { error: message.error }) });
    }
  };
  window.addEventListener('message', receive);
  napplet.motion = {
    state() { subscribe(); return tools.copyMotionState(state); },
    latest() { subscribe(); return latest === null || !state.focused ? null : tools.copyMotionSample(latest); },
    onState(handler) { return on(states, handler); },
    onSample(handler) { return on(samples, handler); },
    requestPermission(absolute) {
      if (absolute !== undefined && typeof absolute !== 'boolean') return Promise.reject(new TypeError('absolute must be a boolean'));
      return new Promise((resolve, reject) => {
        if (disposed) { reject(new Error('Motion binding disposed')); return; }
        subscribe();
        const id = nextId();
        const timeout = window.setTimeout(() => {
          requests.delete(id);
          reject(new Error('motion.permission timed out'));
        }, 30000);
        requests.set(id, { resolve, reject, timeout });
        try { window.parent.postMessage({ type: 'motion.permission', id, ...(absolute === undefined ? {} : { absolute }) }, '*'); }
        catch (error) { requests.delete(id); window.clearTimeout(timeout); reject(error); }
      });
    },
  };
  window.addEventListener('pagehide', () => {
    disposed = true;
    window.removeEventListener('message', receive);
    try { if (subscribed) window.parent.postMessage({ type: 'motion.unsubscribe' }, '*'); }
    finally {
      subscribed = false;
      latest = null;
      state = { available: true, permission: 'prompt', absolute: false, focused: false, frequency: 0 };
      states.clear();
      samples.clear();
      for (const slot of requests.values()) { window.clearTimeout(slot.timeout); slot.reject(new Error('Motion binding disposed')); }
      requests.clear();
    }
  }, { once: true });
}
`;
