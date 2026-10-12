/** CLI publisher attribution using NIP-89's client tag. */

/**
 * Replace inherited client attribution with this publisher's name.
 * @param tags Event tags before signing.
 * @returns New tags containing exactly one napplet.run client tag.
 * @example withClientTag([["d", "notes"]])
 */
export function withClientTag(tags: readonly string[][]): string[][] {
  // https://github.com/nostr-protocol/nips/blob/master/89.md#client-tag
  return [...tags.filter((tag) => tag[0] !== "client"), ["client", "napplet.run"]];
}
