import type { NostrPool } from "applesauce-signers";
import type { AbstractSimplePool, SubCloser } from "nostr-tools/abstract-pool";
import type { Event, Filter } from "nostr-tools";

type ApplesauceSubscription = ReturnType<NostrPool["subscription"]>;

/** Adapt a nostr-tools SimplePool to applesauce-signers' pool interface. */
export function createApplesaucePool(pool: AbstractSimplePool): NostrPool {
  return {
    subscription(relays, filters) {
      return createSubscriptionIterable(
        pool,
        relays,
        filters as unknown as Filter[],
      ) as ApplesauceSubscription;
    },
    async publish(relays, event) {
      await Promise.any(pool.publish(relays, event as unknown as Event));
    },
  };
}

function createSubscriptionIterable(
  pool: AbstractSimplePool,
  relays: string[],
  filters: Filter[],
): AsyncIterable<Event | string> {
  return {
    [Symbol.asyncIterator](): AsyncIterator<Event | string> {
      const queue: (Event | string)[] = [];
      const closers: SubCloser[] = [];
      let waiting: ((result: IteratorResult<Event | string>) => void) | undefined;
      let closed = false;

      const finish = () => {
        if (closed) return;
        closed = true;
        for (const closer of closers) {
          try {
            closer.close();
          } catch { /* best-effort */ }
        }
        closers.length = 0;
        if (waiting) {
          const resolve = waiting;
          waiting = undefined;
          resolve({ value: undefined as never, done: true });
        }
      };

      const emit = (event: Event) => {
        if (closed) return;
        if (waiting) {
          const resolve = waiting;
          waiting = undefined;
          resolve({ value: event, done: false });
          return;
        }
        queue.push(event);
      };

      for (const filter of filters.length > 0 ? filters : [{}]) {
        closers.push(pool.subscribe(relays, filter, { onevent: emit, onclose: finish }));
      }

      return {
        next(): Promise<IteratorResult<Event | string>> {
          if (queue.length > 0) {
            return Promise.resolve({ value: queue.shift()!, done: false });
          }
          if (closed) return Promise.resolve({ value: undefined as never, done: true });
          return new Promise((resolve) => {
            waiting = resolve;
          });
        },
        return(): Promise<IteratorResult<Event | string>> {
          finish();
          return Promise.resolve({ value: undefined as never, done: true });
        },
      };
    },
  };
}
