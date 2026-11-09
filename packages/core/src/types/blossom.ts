/** NAP-BLOSSOM records. Canonical proposal: https://github.com/napplet/naps/pull/71. */
import type { NostrTag, RelayEventResult } from './nostr.js';

/** Runtime authorization policy for a Blossom operation. */
export type BlossomAuthMode = 'auto' | 'required' | 'none';

/** Shared server selection and runtime prompt hints. */
interface BlossomServerRequest {
  server: string;
  auth?: BlossomAuthMode;
  purpose?: string;
}
/** Blob presence request. */
export interface BlossomBlobCheckRequest extends BlossomServerRequest {
  sha256: string;
  extension?: string;
}
/** Blob retrieval request, optionally for a byte range. */
export interface BlossomGetRequest extends BlossomBlobCheckRequest { range?: string; }
/** Advisory upload or media preflight request. */
export interface BlossomCheckRequest extends BlossomServerRequest {
  sha256: string;
  size: number;
  type: string;
}
/** Exact byte upload request; binary objects cross by structured clone. */
export interface BlossomUploadRequest extends BlossomServerRequest {
  data: Blob | ArrayBuffer;
  sha256?: string;
  type?: string;
  size?: number;
}
/** Media upload request; the server may transform the supplied bytes. */
export type BlossomMediaRequest = BlossomUploadRequest;
/** Request to mirror a remote blob to a selected Blossom server. */
export interface BlossomMirrorRequest extends BlossomServerRequest {
  url: string;
  sha256?: string;
}
/** Request for the optional blob listing endpoint. */
export interface BlossomListRequest extends BlossomServerRequest {
  pubkey: string;
  cursor?: string;
  limit?: number;
}
/** Deletion request for exactly one hash. */
export type BlossomDeleteRequest = BlossomBlobCheckRequest;
/** Safe metadata exposed by the runtime, excluding authorization headers. */
export interface BlossomHeaders {
  contentType?: string;
  contentLength?: number;
  acceptRanges?: string;
  sunset?: string;
  reason?: string;
}
/** Stored blob descriptor with extensible server metadata. */
export interface BlossomDescriptor {
  url: string;
  sha256: string;
  size: number;
  type: string;
  uploaded: number;
  nip94?: NostrTag[];
  [key: string]: unknown;
}
/** HTTP or runtime-policy outcome; status 0 may represent a policy failure. */
export interface BlossomDeleteResult {
  ok: boolean;
  status: number;
  error?: string;
}
/** Blob presence outcome, always carrying safe headers. */
export interface BlossomBlobCheckResult extends BlossomDeleteResult { headers: BlossomHeaders; }
/** Retrieved bytes, or an ordinary typed failure. */
export interface BlossomBytesResult extends BlossomDeleteResult {
  blob?: Blob | ArrayBuffer;
  headers?: BlossomHeaders;
}
/** Advisory endpoint preflight outcome. */
export interface BlossomCheckResult extends BlossomDeleteResult { headers?: BlossomHeaders; }
/** Upload, media, or mirror outcome. */
export interface BlossomDescriptorResult extends BlossomDeleteResult { descriptor?: BlossomDescriptor; }
/** Blob listing outcome; failure is not evidence of an empty account. */
export interface BlossomListResult extends BlossomDeleteResult {
  blobs: BlossomDescriptor[];
  cursor?: string;
}
/** Server-list addition with an optional insertion position. */
export interface BlossomAddServerRequest { server: string; position?: number; }
/** Ordered shell-user BUD-03 server list and optional relay-owned event result. */
export interface BlossomServerListResult {
  ok: boolean;
  servers: string[];
  eventId?: string;
  result?: RelayEventResult;
  error?: string;
}
/** Parsed BUD-10 URI; extension includes its leading dot. Server hints retain their supplied scheme, or lack of one. */
export interface BlossomUri {
  sha256: string;
  extension: string;
  servers: string[];
  authors: string[];
  size?: number;
}

/** Runtime-mediated Blossom endpoints and local BUD-10 helpers. */
export interface BlossomApi {
  /** Check blob presence without fetching bytes.
   * @param request Operation input.
   * @returns Runtime outcome, including typed failures.
   * @example await napplet.blossom?.check(request);
   */
  check(request: BlossomBlobCheckRequest): Promise<BlossomBlobCheckResult>;
  /** Retrieve blob bytes through the runtime.
   * @param request Operation input.
   * @returns Runtime outcome, including typed failures.
   * @example await napplet.blossom?.get(request);
   */
  get(request: BlossomGetRequest): Promise<BlossomBytesResult>;
  /** Check advisory upload requirements.
   * @param request Operation input.
   * @returns Runtime outcome, including typed failures.
   * @example await napplet.blossom?.checkUpload(request);
   */
  checkUpload(request: BlossomCheckRequest): Promise<BlossomCheckResult>;
  /** Upload exact bytes to the selected server.
   * @param request Operation input.
   * @returns Runtime outcome, including typed failures.
   * @example await napplet.blossom?.upload(request);
   */
  upload(request: BlossomUploadRequest): Promise<BlossomDescriptorResult>;
  /** Ask the selected server to mirror a blob.
   * @param request Operation input.
   * @returns Runtime outcome, including typed failures.
   * @example await napplet.blossom?.mirror(request);
   */
  mirror(request: BlossomMirrorRequest): Promise<BlossomDescriptorResult>;
  /** Check advisory media requirements.
   * @param request Operation input.
   * @returns Runtime outcome, including typed failures.
   * @example await napplet.blossom?.checkMedia(request);
   */
  checkMedia(request: BlossomCheckRequest): Promise<BlossomCheckResult>;
  /** Upload media that the server may transform.
   * @param request Operation input.
   * @returns Runtime outcome, including typed failures.
   * @example await napplet.blossom?.media(request);
   */
  media(request: BlossomMediaRequest): Promise<BlossomDescriptorResult>;
  /** List blobs using the optional server endpoint.
   * @param request Operation input.
   * @returns Runtime outcome, including typed failures.
   * @example await napplet.blossom?.list(request);
   */
  list(request: BlossomListRequest): Promise<BlossomListResult>;
  /** Delete exactly one blob from the selected server.
   * @param request Operation input.
   * @returns Runtime outcome, including typed failures.
   * @example await napplet.blossom?.delete(request);
   */
  delete(request: BlossomDeleteRequest): Promise<BlossomDeleteResult>;
  /** Read the shell-user ordered server list.
   * @returns Runtime outcome, including typed failures.
   * @example await napplet.blossom?.servers();
   */
  servers(): Promise<BlossomServerListResult>;
  /** Add a server to the shell-user list.
   * @param request Operation input.
   * @returns Runtime outcome, including typed failures.
   * @example await napplet.blossom?.addServer(request);
   */
  addServer(request: BlossomAddServerRequest): Promise<BlossomServerListResult>;
  /** Remove a server from the shell-user list.
   * @param server Operation input.
   * @returns Runtime outcome, including typed failures.
   * @example await napplet.blossom?.removeServer(server);
   */
  removeServer(server: string): Promise<BlossomServerListResult>;
  /** Reorder the existing shell-user server set.
   * @param servers Operation input.
   * @returns Runtime outcome, including typed failures.
   * @example await napplet.blossom?.reorderServers(servers);
   */
  reorderServers(servers: string[]): Promise<BlossomServerListResult>;
  /** Parse a BUD-10 URI without network access.
   * @param uri Blossom URI.
   * @returns Parsed hash, extension, and discovery hints.
   * @example const reference = napplet.blossom?.parseUri(uri);
   */
  parseUri(uri: string): BlossomUri;
  /** Format a BUD-10 URI without network access.
   * @param uri Blob reference; an empty extension defaults to .bin.
   * @returns Blossom URI.
   * @example const uri = napplet.blossom?.formatUri(reference);
   */
  formatUri(uri: BlossomUri): string;
}
