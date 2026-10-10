/** NIP-19 pointers for signed deploy events. */
import { nip19 } from "nostr-tools";
import type { SignedNostrEvent } from "./types.ts";

export interface EventPointers {
  nevent: string;
  naddr?: string;
}

/**
 * Create NIP-19 pointers for a signed deploy event.
 *
 * @param event Signed event to reference.
 * @param relays Relays where the event was or will be published.
 * @returns Exact-event pointer plus address pointer when the event is addressable.
 * @example
 * ```ts
 * createEventPointers(event, ["wss://relay.example"]).nevent;
 * ```
 */
export function createEventPointers(
  event: SignedNostrEvent,
  relays: readonly string[] = [],
): EventPointers {
  const relayHints = relays.length > 0 ? [...relays] : undefined;
  const pointers: EventPointers = {
    nevent: nip19.neventEncode({
      id: event.id,
      author: event.pubkey,
      kind: event.kind,
      relays: relayHints,
    }),
  };
  if (isReplaceableKind(event.kind)) {
    pointers.naddr = nip19.naddrEncode({
      identifier: event.tags.find((tag) => tag[0] === "d")?.[1] ?? "",
      pubkey: event.pubkey,
      kind: event.kind,
      relays: relayHints,
    });
  }
  return pointers;
}

function isReplaceableKind(kind: number): boolean {
  return kind >= 10_000 && kind < 40_000;
}
