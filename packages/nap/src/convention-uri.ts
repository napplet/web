/**
 * Internal normalization for the two adopted convention-URI call boundaries.
 * This module is deliberately not re-exported from the package public API.
 */

/** The URI-derived convention identity and optional call payload. */
export interface NormalizedConventionUri {
  archetype: string;
  action: string;
  convention: string;
  payload?: unknown;
}

/**
 * Normalize a documented convention URI without applying form or Unicode
 * normalization. Query parameters are shallow text payload sugar only.
 */
export function normalizeConventionUri(
  uri: string,
  explicitPayload?: unknown,
): NormalizedConventionUri {
  const queryIndex = uri.indexOf('?');
  const fragmentIndex = uri.indexOf('#');
  const pathEnd = [queryIndex, fragmentIndex]
    .filter((index) => index >= 0)
    .reduce((end, index) => Math.min(end, index), uri.length);
  const convention = uri.slice(0, pathEnd);
  const match = /^napplet:([^/?#]+)\/([^/?#]+)$/.exec(convention);

  if (!match) {
    throw new Error('Convention URI must use napplet:<archetype>/<intent> syntax');
  }
  if (fragmentIndex >= 0) {
    throw new Error('Convention URI fragments are not supported');
  }

  const [, archetype, action] = match;
  if (queryIndex < 0) {
    return {
      archetype,
      action,
      convention,
      ...(explicitPayload !== undefined ? { payload: explicitPayload } : {}),
    };
  }
  if (explicitPayload !== undefined) {
    throw new Error('Convention URI queries cannot be combined with an explicit payload');
  }

  const names = new Set<string>();
  const entries: Array<[string, string]> = [];
  const query = uri.slice(queryIndex + 1);

  if (query) {
    for (const pair of query.split('&')) {
      const separator = pair.indexOf('=');
      if (separator < 0) {
        throw new Error('Convention URI query parameters must use name=value form');
      }

      const name = decodeURIComponent(pair.slice(0, separator));
      const value = decodeURIComponent(pair.slice(separator + 1));
      if (names.has(name)) {
        throw new Error('Convention URI query parameter names must be unique');
      }
      names.add(name);
      entries.push([name, value]);
    }
  }

  return { archetype, action, convention, payload: Object.fromEntries(entries) };
}
