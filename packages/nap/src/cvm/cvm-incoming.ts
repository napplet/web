import type {
  CvmCloseResultMessage,
  CvmDiscoverResultMessage,
  CvmEventMessage,
  CvmRegistryCallResultMessage,
  CvmRegistryDescribeResultMessage,
  CvmRegistryHasResultMessage,
  CvmRegistryListResultMessage,
  CvmRequestResultMessage,
} from './types.js';
import {
  eventHandlers,
  pendingClose,
  pendingDiscover,
  pendingRegistryCall,
  pendingRegistryDescribe,
  pendingRegistryHas,
  pendingRegistryList,
  pendingRequest,
} from './cvm-state.js';

function isMessageType<T extends { type: string }>(
  msg: { type: string },
  type: T['type'],
): msg is T {
  return msg.type === type;
}

function handleDiscoverResult(msg: CvmDiscoverResultMessage): void {
  const p = pendingDiscover.get(msg.id);
  if (!p) return;
  pendingDiscover.delete(msg.id);
  clearTimeout(p.timeout);
  if (msg.error !== undefined) {
    p.reject(new Error(msg.error));
    return;
  }
  // NAP-CVM §Error Handling: on success the payload is required, so a result
  // with neither `error` nor a `servers` list is malformed, not an empty list.
  if (!Array.isArray(msg.servers)) {
    p.reject(new Error('cvm.discover.result missing servers'));
    return;
  }
  p.resolve(msg.servers);
}

function handleRequestResult(msg: CvmRequestResultMessage): void {
  const p = pendingRequest.get(msg.id);
  if (!p) return;
  pendingRequest.delete(msg.id);
  clearTimeout(p.timeout);
  if (msg.error !== undefined) {
    p.reject(new Error(msg.error));
    return;
  }
  if (msg.message === undefined) {
    p.reject(new Error('cvm.request.result missing message'));
    return;
  }
  p.resolve(msg.message);
}

function handleCloseResult(msg: CvmCloseResultMessage): void {
  const p = pendingClose.get(msg.id);
  if (!p) return;
  pendingClose.delete(msg.id);
  clearTimeout(p.timeout);
  if (msg.error !== undefined) {
    p.reject(new Error(msg.error));
    return;
  }
  p.resolve();
}

function handleEvent(msg: CvmEventMessage): void {
  if (!msg.server || !msg.message) return;
  for (const cb of eventHandlers) {
    cb(msg.server, msg.message);
  }
}

function handleRegistryListResult(msg: CvmRegistryListResultMessage): void {
  const p = pendingRegistryList.get(msg.id);
  if (!p) return;
  pendingRegistryList.delete(msg.id);
  clearTimeout(p.timeout);
  if (msg.error !== undefined) {
    p.reject(new Error(msg.error));
    return;
  }
  p.resolve(Array.isArray(msg.entries) ? msg.entries : []);
}

function handleRegistryHasResult(msg: CvmRegistryHasResultMessage): void {
  const p = pendingRegistryHas.get(msg.id);
  if (!p) return;
  pendingRegistryHas.delete(msg.id);
  clearTimeout(p.timeout);
  if (msg.error !== undefined) {
    p.reject(new Error(msg.error));
    return;
  }
  p.resolve(msg.has === true);
}

function handleRegistryDescribeResult(msg: CvmRegistryDescribeResultMessage): void {
  const p = pendingRegistryDescribe.get(msg.id);
  if (!p) return;
  pendingRegistryDescribe.delete(msg.id);
  clearTimeout(p.timeout);
  if (msg.error !== undefined) {
    p.reject(new Error(msg.error));
    return;
  }
  if (msg.entry === undefined) {
    p.reject(new Error('cvm.registry.describe.result missing entry'));
    return;
  }
  p.resolve(msg.entry);
}

function handleRegistryCallResult(msg: CvmRegistryCallResultMessage): void {
  const p = pendingRegistryCall.get(msg.id);
  if (!p) return;
  pendingRegistryCall.delete(msg.id);
  clearTimeout(p.timeout);
  if (msg.error !== undefined) {
    p.reject(new Error(msg.error));
    return;
  }
  if (msg.result === undefined) {
    p.reject(new Error('cvm.registry.call.result missing result'));
    return;
  }
  p.resolve(msg.result);
}

/**
 * Handle cvm.* messages from the shell via the central message listener.
 * Covers cvm.discover.result, cvm.request.result, cvm.close.result, and cvm.event.
 */
export function handleCvmMessage(msg: { type: string; [key: string]: unknown }): void {
  if (isMessageType<CvmDiscoverResultMessage>(msg, 'cvm.discover.result')) {
    handleDiscoverResult(msg);
  } else if (isMessageType<CvmRequestResultMessage>(msg, 'cvm.request.result')) {
    handleRequestResult(msg);
  } else if (isMessageType<CvmCloseResultMessage>(msg, 'cvm.close.result')) {
    handleCloseResult(msg);
  } else if (isMessageType<CvmEventMessage>(msg, 'cvm.event')) {
    handleEvent(msg);
  } else if (isMessageType<CvmRegistryListResultMessage>(msg, 'cvm.registry.list.result')) {
    handleRegistryListResult(msg);
  } else if (isMessageType<CvmRegistryHasResultMessage>(msg, 'cvm.registry.has.result')) {
    handleRegistryHasResult(msg);
  } else if (isMessageType<CvmRegistryDescribeResultMessage>(msg, 'cvm.registry.describe.result')) {
    handleRegistryDescribeResult(msg);
  } else if (isMessageType<CvmRegistryCallResultMessage>(msg, 'cvm.registry.call.result')) {
    handleRegistryCallResult(msg);
  }
}
