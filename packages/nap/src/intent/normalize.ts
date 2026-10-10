/** URI binding defined by NAP-INTENT and the NAP web projection. */
import { decode } from 'nostr-tools/nip19';
import type { IntentHandlerHint, IntentInvokeOptions, IntentRequest } from '@napplet/core';
import { normalizeConventionUri } from '../convention-uri.js';

function validateHint(hint: IntentHandlerHint): IntentHandlerHint {
  if (!/^35129:[0-9a-f]{64}:[\s\S]+$/.test(hint.address)) {
    throw new Error('Intent handler hint requires a named napplet coordinate');
  }
  if (hint.relays !== undefined && !hint.relays.every((relay) => typeof relay === 'string')) {
    throw new Error('Intent handler relay hints must be strings');
  }
  return { address: hint.address, ...(hint.relays ? { relays: [...hint.relays] } : {}) };
}

function decodeHint(fragment: string): IntentHandlerHint {
  if (!fragment.startsWith('naddr1')) throw new Error('Intent handler fragment must be a bare naddr');
  const pointer = decode(fragment);
  if (pointer.type !== 'naddr') throw new Error('Intent handler fragment must be a bare naddr');
  const { kind, pubkey, identifier, relays } = pointer.data;
  return validateHint({ address: `${kind}:${pubkey}:${identifier}`, ...(relays?.length ? { relays } : {}) });
}

/** Derive the wire request before allocating a correlation id or sending traffic. */
export function normalizeIntentUri(uri: string, options: IntentInvokeOptions = {}): IntentRequest {
  const fragmentIndex = uri.indexOf('#');
  if (fragmentIndex >= 0 && options.handlerHint !== undefined) {
    throw new Error('Intent handler fragment cannot accompany an explicit handler hint');
  }
  const normalized = normalizeConventionUri(fragmentIndex < 0 ? uri : uri.slice(0, fragmentIndex), options.payload);
  const handlerHint = fragmentIndex < 0
    ? (options.handlerHint === undefined ? undefined : validateHint(options.handlerHint))
    : decodeHint(uri.slice(fragmentIndex + 1));
  return {
    ...normalized,
    ...(options.handler !== undefined ? { handler: options.handler } : {}),
    ...(options.behavior !== undefined ? { behavior: options.behavior } : {}),
    ...(handlerHint !== undefined ? { handlerHint } : {}),
  };
}
