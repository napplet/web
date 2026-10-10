import type { Subscription } from '../nostr.js';
import type { UploadInfo, UploadRequest, UploadResult, UploadStatus } from '../upload.js';
import type {
  IntentAvailability,
  IntentInvokeOptions,
  IntentDelivery,
  IntentResult,
} from '../intent.js';
import type { LinkOpenOptions, LinkOpenResult } from '../link.js';
import type { CountFilter, CountOptions, CountResult } from '../count.js';
import type { ListItem, ListMutationResult, ListOptions, ListRef, ListSupport } from '../lists.js';

/**
 * Shell-mediated file/blob upload (NAP-UPLOAD): the napplet hands the shell raw
 * bytes plus upload intent; the shell selects a storage server, signs the rail
 * authorization (NIP-98 for NIP-96, kind 24242 for Blossom), performs the HTTP
 * upload, and returns a stable URL plus NIP-94 integrity metadata. The shell is
 * the policy and consent boundary; napplets never receive signing keys, server
 * credentials, or direct network access.
 *
 * @example
 * ```ts
 * if (window.napplet.upload) {
 *   const result = await window.napplet.upload.upload({ data: blob, filename: 'pic.png' });
 *   if (result.status === 'complete') attach(result.url, result.nip94);
 * }
 * ```
 */
export interface UploadApi {
  /**
   * Inspect upload rails and coarse policy limits the runtime is willing to
   * disclose. Advisory only; callers can upload without a preflight.
   * @returns Promise resolving to the upload info snapshot.
   */
  info(): Promise<UploadInfo>;
  /**
   * Upload bytes. The shell handles consent, server selection, rail auth
   * signing, and the HTTP upload, then resolves with the initial result.
   * Large/async uploads resolve with `status: "uploading"` and report progress
   * via `onStatus`. Resolves with the result even on `ok: false`
   * (created-then-failed/cancelled); rejects only on a top-level error.
   * @param request  The upload request (Blob/ArrayBuffer bytes + intent)
   * @returns Promise resolving to the initial upload result
   */
  upload(request: UploadRequest): Promise<UploadResult>;
  /**
   * Get the latest known status for a prior upload, including progress counters.
   * @param uploadId  The shell-generated id from a prior upload
   * @returns Promise resolving to the latest status
   */
  status(uploadId: string): Promise<UploadStatus>;
  /**
   * Register for shell-pushed status updates (progress, complete/failed).
   * @param handler  Called with each new UploadStatus
   * @returns A Subscription with `close()` to stop listening
   */
  onStatus(handler: (status: UploadStatus) => void): Subscription;
}

/**
 * Archetype intent dispatch (NAP-INTENT): invoke another napplet through an
 * authoritative convention URI without addressing it directly. The runtime
 * derives the archetype, action, queryless convention identity, and any
 * query-derived payload before resolving an installed, user-authorized handler.
 * @example
 * ```ts
 * if (window.napplet.intent) {
 *   const { available } = await window.napplet.intent.available('note');
 *   if (available) {
 *     await window.napplet.intent.open('napplet:note/open', { payload: { event: 'abc123' } });
 *   }
 * }
 * ```
 */
export interface IntentApi {
  /**
   * Dispatch an intent request by archetype.
   * @param uri Authoritative convention URI
   * @param options Structured payload and runtime selection hints
   * @returns Promise resolving to the dispatch result
   */
  invoke(uri: string, options?: IntentInvokeOptions): Promise<IntentResult>;
  /**
   * Convenience sugar for `invoke(uri, options)` with an open action.
   * @param uri Convention URI whose action is open
   * @param options Structured payload and runtime selection hints
   * @returns Promise resolving to the dispatch result
   */
  open(uri: string, options?: IntentInvokeOptions): Promise<IntentResult>;
  /**
   * Whether the runtime can currently satisfy `archetype`, with candidates and
   * the actions and conventions each supports. Sourced from the installed
   * catalog.
   * @param archetype  Role slug to check
   * @returns Promise resolving to the archetype availability
   */
  available(archetype: string): Promise<IntentAvailability>;
  /**
   * Availability for every archetype the runtime can currently satisfy.
   * @returns Promise resolving to availability for each satisfiable archetype
   */
  handlers(): Promise<IntentAvailability[]>;
  /**
   * Register for shell-pushed availability updates (install/remove/default change).
   * @param handler  Called with each updated IntentAvailability
   * @returns A Subscription with `close()` to stop listening
   */
  onChanged(handler: (availability: IntentAvailability) => void): Subscription;
  /**
   * Receive retained and future runtime-attested deliveries.
   * @param handler Callback for each target delivery
   * @returns Subscription handle
   * @example
   * napplet.intent?.onDelivery(({ payload }) => render(payload));
   */
  onDelivery(handler: (delivery: IntentDelivery) => void): Subscription;
}

/**
 * Shell-mediated link opening (NAP-LINK): the napplet asks the shell to open an
 * external URL for the user. The shell owns navigation, policy, prompting,
 * opener isolation, and browser context. The napplet receives no network
 * access, opener authority, or fetched bytes.
 *
 * @example
 * ```ts
 * if (window.napplet.link) {
 *   const result = await window.napplet.link.open('https://example.com/post/123', { label: 'Read post' });
 *   if (result.status === 'denied') showInlineFallback();
 * }
 * ```
 */
export interface LinkApi {
  /**
   * Request that the shell open an external URL for the user.
   * @param url      Absolute URL to open
   * @param options  Optional prompt/display hints
   * @returns Promise resolving to the shell's open/deny status
  */
  open(url: string, options?: LinkOpenOptions): Promise<LinkOpenResult>;
}

/**
 * Runtime-mediated event counts (NAP-COUNT): the napplet supplies one or more
 * NIP-01 filters, and the runtime returns aggregate count metadata without
 * sending matching event payloads. The runtime owns relay choice, NIP-45 COUNT
 * support, indexes, caches, approximation, and refusal policy.
 *
 * @example
 * ```ts
 * if (window.napplet.count) {
 *   const { count } = await window.napplet.count.query({ kinds: [7], '#e': [eventId] });
 * }
 * ```
 */
export interface CountApi {
  /**
   * Count events matching a non-empty NIP-01 filter array.
   * @param filters  One NIP-01 filter or a non-empty array of filters
   * @param options  Optional approximation and HyperLogLog hints
   * @returns Promise resolving to the runtime count result
   */
  query(filters: CountFilter | CountFilter[], options?: CountOptions): Promise<CountResult>;
}

/**
 * Runtime-mediated NIP-51 list mutation (NAP-LISTS): the napplet names a list
 * and semantic items to add/remove; the runtime owns current-event lookup,
 * kind/type mapping, tag formatting, private item encryption, preservation,
 * signing, and publishing.
 *
 * @example
 * ```ts
 * if (window.napplet.lists) {
 *   await window.napplet.lists.add({ type: 'mute-list' }, [
 *     { itemType: 'pubkey', value: 'abc123...' },
 *   ]);
 * }
 * ```
 */
export interface ListsApi {
  /**
   * Return the NIP-51 list kinds/types this runtime supports.
   * @returns Promise resolving to supported list descriptions
   */
  supported(): Promise<ListSupport[]>;
  /**
   * Add items to a runtime-supported NIP-51 list.
   * @param list     List reference by kind or derived type
   * @param items    Items to add
   * @param options  Optional create/metadata hints
   * @returns Promise resolving to the mutation result
   */
  add(list: ListRef, items: ListItem[], options?: ListOptions): Promise<ListMutationResult>;
  /**
   * Remove items from a runtime-supported NIP-51 list.
   * @param list     List reference by kind or derived type
   * @param items    Items to remove
   * @param options  Optional runtime hints
   * @returns Promise resolving to the mutation result
   */
  remove(list: ListRef, items: ListItem[], options?: ListOptions): Promise<ListMutationResult>;
}
