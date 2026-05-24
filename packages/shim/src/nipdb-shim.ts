
import type { NostrEvent, NostrFilter } from '@napplet/core';

interface NostrDbRequestMessage {
  type: 'nostrdb.request';
  id: string;
  method: string;
  content: string;
  subId?: string;
}

interface NostrDbResultMessage {
  type: 'nostrdb.result';
  id: string;
  method?: string;
  content: string;
}

interface NostrDbEventPushMessage {
  type: 'nostrdb.event-push';
  subId: string;
  content: string;
}

interface NostrDbApi {
  query(filters: NostrFilter | NostrFilter[]): Promise<NostrEvent[]>;
  add(event: NostrEvent): Promise<boolean>;
  event(id: string): Promise<NostrEvent | undefined>;
  replaceable(kind: number, author: string, identifier?: string): Promise<NostrEvent | undefined>;
  count(filters: NostrFilter | NostrFilter[]): Promise<number>;
  supports(): Promise<string[]>;
  subscribe(filters: NostrFilter | NostrFilter[]): AsyncGenerator<NostrEvent>;
}

type NostrDbWindow = Window & typeof globalThis & {
  nostrdb?: NostrDbApi;
};

/** Pending NIPDB requests: correlationId -> { resolve, reject } */
const nipdbPending = new Map<string, {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
}>();

/**
 * Active subscribe handlers: subId -> event callback.
 */
const nipdbSubscribeHandlers = new Map<string, (event: NostrEvent) => void>();

/**
 * Subscribe cancellers: subId -> function that unblocks the waiting generator.
 */
const nipdbSubscribeCancellers = new Map<string, () => void>();

function sendNipdbRequestRaw(
  method: string,
  content: string,
  subId?: string,
): string {
  const correlationId = crypto.randomUUID();

  const msg: NostrDbRequestMessage = {
    type: 'nostrdb.request',
    id: correlationId,
    method,
    content,
    ...(subId ? { subId } : {}),
  };
  window.parent.postMessage(msg, '*');

  return correlationId;
}

function sendNipdbRequest(
  method: string,
  content: string,
  subId?: string,
): Promise<unknown> {
  return new Promise<unknown>((resolve, reject) => {
    const correlationId = sendNipdbRequestRaw(method, content, subId);

    nipdbPending.set(correlationId, { resolve, reject });

    setTimeout(() => {
      if (nipdbPending.delete(correlationId)) {
        reject(new Error(`NIPDB request '${method}' timed out`));
      }
    }, 10_000);
  });
}

function handleNipdbResult(msg: NostrDbResultMessage): void {
  const pending = nipdbPending.get(msg.id);
  if (!pending) return;

  nipdbPending.delete(msg.id);

  try {
    const result = msg.content ? JSON.parse(msg.content) : undefined;
    pending.resolve(result);
  } catch {
    pending.resolve(undefined);
  }
}

function handleNipdbEventPush(msg: NostrDbEventPushMessage): void {
  const handler = nipdbSubscribeHandlers.get(msg.subId);
  if (handler) {
    try {
      const pushedEvent = JSON.parse(msg.content) as NostrEvent;
      handler(pushedEvent);
    } catch {
      // Malformed push -- ignore
    }
  }
}

const SUPPORTED_METHODS = ['query', 'add', 'event', 'replaceable', 'count', 'subscribe'] as const;

function handleNipdbMessage(msgEvent: MessageEvent): void {
  const msg = msgEvent.data;
  if (typeof msg !== 'object' || msg === null || typeof msg.type !== 'string') return;
  if (!msg.type.startsWith('nostrdb.')) return;

  if (msg.type === 'nostrdb.result') {
    handleNipdbResult(msg as NostrDbResultMessage);
  } else if (msg.type === 'nostrdb.event-push') {
    handleNipdbEventPush(msg as NostrDbEventPushMessage);
  }
}

/**
 * Install window.nostrdb with the full NIP-DB spec surface.
 *
 * @returns cleanup function that removes window.nostrdb.
 */
export function installNostrDb(): () => void {
  window.addEventListener('message', handleNipdbMessage);

  (window as NostrDbWindow).nostrdb = {
    async query(filters: NostrFilter | NostrFilter[]): Promise<NostrEvent[]> {
      const normalizedFilters = Array.isArray(filters) ? filters : [filters];
      const result = await sendNipdbRequest('query', JSON.stringify(normalizedFilters));
      return (result as NostrEvent[]) ?? [];
    },

    async add(event: NostrEvent): Promise<boolean> {
      const result = await sendNipdbRequest('add', JSON.stringify(event));
      return result === true;
    },

    async event(id: string): Promise<NostrEvent | undefined> {
      const result = await sendNipdbRequest('event', JSON.stringify({ id }));
      return result == null ? undefined : (result as NostrEvent);
    },

    async replaceable(kind: number, author: string, identifier?: string): Promise<NostrEvent | undefined> {
      const payload: { kind: number; author: string; identifier?: string } = { kind, author };
      if (identifier !== undefined) payload.identifier = identifier;
      const result = await sendNipdbRequest('replaceable', JSON.stringify(payload));
      return result == null ? undefined : (result as NostrEvent);
    },

    async count(filters: NostrFilter | NostrFilter[]): Promise<number> {
      const normalizedFilters = Array.isArray(filters) ? filters : [filters];
      const result = await sendNipdbRequest('count', JSON.stringify(normalizedFilters));
      return typeof result === 'number' ? result : 0;
    },

    async supports(): Promise<string[]> {
      return [...SUPPORTED_METHODS];
    },

    async *subscribe(filters: NostrFilter | NostrFilter[]): AsyncGenerator<NostrEvent> {
      const subId = crypto.randomUUID();
      const normalizedFilters = Array.isArray(filters) ? filters : [filters];

      sendNipdbRequestRaw('subscribe', JSON.stringify(normalizedFilters), subId);

      const queue: NostrEvent[] = [];
      let wakeResolve: (() => void) | null = null;

      function wake(): void {
        if (wakeResolve) {
          const r = wakeResolve;
          wakeResolve = null;
          r();
        }
      }

      nipdbSubscribeHandlers.set(subId, (event: NostrEvent) => {
        queue.push(event);
        wake();
      });

      nipdbSubscribeCancellers.set(subId, wake);

      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          if (queue.length > 0) {
            yield queue.shift()!;
          } else {
            await new Promise<void>(resolve => {
              wakeResolve = resolve;
            });
          }
        }
      } finally {
        nipdbSubscribeHandlers.delete(subId);
        nipdbSubscribeCancellers.delete(subId);
        sendNipdbRequestRaw('unsubscribe', JSON.stringify({ subId }), subId);
      }
    },
  };

  return () => {
    window.removeEventListener('message', handleNipdbMessage);
    delete (window as NostrDbWindow).nostrdb;
    nipdbPending.clear();
    nipdbSubscribeHandlers.clear();
  };
}
