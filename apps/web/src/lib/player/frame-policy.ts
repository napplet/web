/**
 * The page policy that keeps the preview frame on its verified document.
 *
 * CSP checks every navigation of a child frame against the embedding page's `frame-src`, including a navigation the
 * napplet starts itself before its first `load`. NIP-5D's replacement evidence (a second hello or load, the port
 * closing) cannot observe that case, because only the replacement fires `load` and browsers fire no MessagePort
 * `close` event. A `srcdoc` document is not fetched, so it still loads. This is site policy for the player page, not
 * napplet protocol surface: https://github.com/nostr-protocol/nips/pull/2303
 */
export const FRAME_POLICY = "frame-src 'none'";

/**
 * Whether the page carries {@link FRAME_POLICY} in a CSP meta element, so the player can refuse to run without it.
 * @param doc The player page.
 * @returns True when the policy is present.
 * @example if (!hasFramePolicy(document)) throw new Error('Preview unavailable');
 */
export function hasFramePolicy(doc: Pick<Document, 'querySelectorAll'>): boolean {
  return [...doc.querySelectorAll<HTMLMetaElement>('meta[http-equiv="Content-Security-Policy" i]')]
    .some(meta => meta.content.split(';').some(directive => directive.trim() === FRAME_POLICY));
}
