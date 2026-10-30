/** Application-side NAP-BLOSSOM helpers; no domain is installed by importing this module. */
import type {
  NappletGlobal,
  BlossomApi,
  BlossomUri,
  BlossomBlobCheckRequest,
  BlossomGetRequest,
  BlossomCheckRequest,
  BlossomUploadRequest,
  BlossomMirrorRequest,
  BlossomMediaRequest,
  BlossomListRequest,
  BlossomDeleteRequest,
  BlossomAddServerRequest,
  BlossomBlobCheckResult,
  BlossomBytesResult,
  BlossomCheckResult,
  BlossomDescriptorResult,
  BlossomListResult,
  BlossomDeleteResult,
  BlossomServerListResult,
} from '@napplet/core';

function requireBlossom(): BlossomApi {
  const napplet = typeof window === 'undefined' ? undefined : (window as Window & { napplet?: NappletGlobal }).napplet;
  if (!napplet?.blossom) throw new Error('window.napplet.blossom is unavailable -- runtime did not inject this domain');
  return napplet.blossom;
}

/**
 * Check blob presence without fetching bytes.
 * @param request Operation input.
 * @returns Runtime outcome, including typed failures.
 * @example const result = await blossomCheck(request);
 */
export function blossomCheck(request: BlossomBlobCheckRequest): Promise<BlossomBlobCheckResult> { return requireBlossom().check(request); }
/** Ergonomic alias for {@link blossomCheck}. */
export { blossomCheck as check };

/**
 * Retrieve blob bytes through the runtime.
 * @param request Operation input.
 * @returns Runtime outcome, including typed failures.
 * @example const result = await blossomGet(request);
 */
export function blossomGet(request: BlossomGetRequest): Promise<BlossomBytesResult> { return requireBlossom().get(request); }
/** Ergonomic alias for {@link blossomGet}. */
export { blossomGet as get };

/**
 * Check advisory upload requirements.
 * @param request Operation input.
 * @returns Runtime outcome, including typed failures.
 * @example const result = await blossomCheckUpload(request);
 */
export function blossomCheckUpload(request: BlossomCheckRequest): Promise<BlossomCheckResult> { return requireBlossom().checkUpload(request); }
/** Ergonomic alias for {@link blossomCheckUpload}. */
export { blossomCheckUpload as checkUpload };

/**
 * Upload exact bytes to the selected server.
 * @param request Operation input.
 * @returns Runtime outcome, including typed failures.
 * @example const result = await blossomUpload(request);
 */
export function blossomUpload(request: BlossomUploadRequest): Promise<BlossomDescriptorResult> { return requireBlossom().upload(request); }
/** Ergonomic alias for {@link blossomUpload}. */
export { blossomUpload as upload };

/**
 * Ask the selected server to mirror a blob.
 * @param request Operation input.
 * @returns Runtime outcome, including typed failures.
 * @example const result = await blossomMirror(request);
 */
export function blossomMirror(request: BlossomMirrorRequest): Promise<BlossomDescriptorResult> { return requireBlossom().mirror(request); }
/** Ergonomic alias for {@link blossomMirror}. */
export { blossomMirror as mirror };

/**
 * Check advisory media requirements.
 * @param request Operation input.
 * @returns Runtime outcome, including typed failures.
 * @example const result = await blossomCheckMedia(request);
 */
export function blossomCheckMedia(request: BlossomCheckRequest): Promise<BlossomCheckResult> { return requireBlossom().checkMedia(request); }
/** Ergonomic alias for {@link blossomCheckMedia}. */
export { blossomCheckMedia as checkMedia };

/**
 * Upload media that the server may transform.
 * @param request Operation input.
 * @returns Runtime outcome, including typed failures.
 * @example const result = await blossomMedia(request);
 */
export function blossomMedia(request: BlossomMediaRequest): Promise<BlossomDescriptorResult> { return requireBlossom().media(request); }
/** Ergonomic alias for {@link blossomMedia}. */
export { blossomMedia as media };

/**
 * List blobs using the optional server endpoint.
 * @param request Operation input.
 * @returns Runtime outcome, including typed failures.
 * @example const result = await blossomList(request);
 */
export function blossomList(request: BlossomListRequest): Promise<BlossomListResult> { return requireBlossom().list(request); }
/** Ergonomic alias for {@link blossomList}. */
export { blossomList as list };

/**
 * Delete exactly one blob from the selected server.
 * @param request Operation input.
 * @returns Runtime outcome, including typed failures.
 * @example const result = await blossomDelete(request);
 */
export function blossomDelete(request: BlossomDeleteRequest): Promise<BlossomDeleteResult> { return requireBlossom().delete(request); }
/** Ergonomic alias for {@link blossomDelete}. */
export { blossomDelete as delete };

/**
 * Read the shell-user ordered server list.
 * @returns Runtime outcome, including typed failures.
 * @example const result = await blossomServers();
 */
export function blossomServers(): Promise<BlossomServerListResult> { return requireBlossom().servers(); }
/** Ergonomic alias for {@link blossomServers}. */
export { blossomServers as servers };

/**
 * Add a server to the shell-user list.
 * @param request Operation input.
 * @returns Runtime outcome, including typed failures.
 * @example const result = await blossomAddServer(request);
 */
export function blossomAddServer(request: BlossomAddServerRequest): Promise<BlossomServerListResult> { return requireBlossom().addServer(request); }
/** Ergonomic alias for {@link blossomAddServer}. */
export { blossomAddServer as addServer };

/**
 * Remove a server from the shell-user list.
 * @param server Operation input.
 * @returns Runtime outcome, including typed failures.
 * @example const result = await blossomRemoveServer(server);
 */
export function blossomRemoveServer(server: string): Promise<BlossomServerListResult> { return requireBlossom().removeServer(server); }
/** Ergonomic alias for {@link blossomRemoveServer}. */
export { blossomRemoveServer as removeServer };

/**
 * Reorder the existing shell-user server set.
 * @param servers Operation input.
 * @returns Runtime outcome, including typed failures.
 * @example const result = await blossomReorderServers(servers);
 */
export function blossomReorderServers(servers: string[]): Promise<BlossomServerListResult> { return requireBlossom().reorderServers(servers); }
/** Ergonomic alias for {@link blossomReorderServers}. */
export { blossomReorderServers as reorderServers };

/**
 * Parse a BUD-10 URI locally through the injected domain.
 * @param uri Blob reference.
 * @returns Parsed reference.
 * @example const result = blossomParseUri(uri);
 */
export function blossomParseUri(uri: string): BlossomUri { return requireBlossom().parseUri(uri); }
/** Ergonomic alias for {@link blossomParseUri}. */
export { blossomParseUri as parseUri };

/**
 * Format a BUD-10 URI locally through the injected domain.
 * @param uri Blob reference.
 * @returns Blossom URI.
 * @example const result = blossomFormatUri(uri);
 */
export function blossomFormatUri(uri: BlossomUri): string { return requireBlossom().formatUri(uri); }
/** Ergonomic alias for {@link blossomFormatUri}. */
export { blossomFormatUri as formatUri };
