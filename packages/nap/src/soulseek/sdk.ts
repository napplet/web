/** SDK helpers for the runtime-injected NAP-SOULSEEK domain. @module */
import type {
  NappletGlobal,
  SoulseekApi,
  SoulseekByteCount,
  SoulseekChunk,
  SoulseekFailure,
  SoulseekHandleKind,
  SoulseekInfo,
  SoulseekQuery,
  SoulseekQueryPage,
  SoulseekReleased,
  SoulseekSaved,
  SoulseekSearchRequest,
  SoulseekTransfer,
} from '@napplet/core';
import { SOULSEEK_ERROR_CODES } from './types.js';

function requireSoulseek(): SoulseekApi {
  const runtime = (window as Window & { napplet?: NappletGlobal }).napplet;
  if (!runtime?.soulseek) throw new Error('window.napplet.soulseek is unavailable -- runtime did not inject this domain');
  return runtime.soulseek;
}

/** Recognize a rejection that carries a NAP-SOULSEEK `Failure`, across bundle boundaries.
 * @param error Any caught value.
 * @returns `true` when `error` has a specification error `code` and a text `message`.
 * @example try { await soulseekRead(id, '0', 1); } catch (error) { if (isSoulseekFailure(error) && error.code === 'denied') showConsentHint(); }
 */
export function isSoulseekFailure(error: unknown): error is Error & SoulseekFailure {
  if (!error || typeof error !== 'object') return false;
  const record = error as Record<string, unknown>;
  return typeof record.code === 'string' && (SOULSEEK_ERROR_CODES as readonly string[]).includes(record.code)
    && typeof record.message === 'string';
}

/** Delegate soulseek.info to the current runtime.
 * @returns Account state and policy limits.
 * @example await soulseekInfo();
 */
export function soulseekInfo(): Promise<SoulseekInfo> {
  return requireSoulseek().info();
}

/** Delegate soulseek.search to the current runtime.
 * @param request Search expression and optional target peer.
 * @returns The admitted query.
 * @example await soulseekSearch({ text: 'field recording' });
 */
export function soulseekSearch(request: SoulseekSearchRequest): Promise<SoulseekQuery> {
  return requireSoulseek().search(request);
}

/** Delegate soulseek.browse to the current runtime.
 * @param username Peer name.
 * @returns The admitted query.
 * @example await soulseekBrowse('field-recorder');
 */
export function soulseekBrowse(username: string): Promise<SoulseekQuery> {
  return requireSoulseek().browse(username);
}

/** Delegate soulseek.results to the current runtime.
 * @param queryId Owned query handle.
 * @param after Zero-based offset.
 * @param limit Positive page size.
 * @returns One page and its query snapshot.
 * @example await soulseekResults(queryId, 0, 25);
 */
export function soulseekResults(queryId: string, after?: number, limit?: number): Promise<SoulseekQueryPage> {
  return requireSoulseek().results(queryId, after, limit);
}

/** Delegate soulseek.stop to the current runtime.
 * @param queryId Owned query handle.
 * @returns The terminal query snapshot.
 * @example await soulseekStop(queryId);
 */
export function soulseekStop(queryId: string): Promise<SoulseekQuery> {
  return requireSoulseek().stop(queryId);
}

/** Delegate soulseek.download to the current runtime.
 * @param fileId Live file handle.
 * @returns The admitted or existing transfer.
 * @example await soulseekDownload(fileId);
 */
export function soulseekDownload(fileId: string): Promise<SoulseekTransfer> {
  return requireSoulseek().download(fileId);
}

/** Delegate soulseek.transfers to the current runtime.
 * @returns Owned transfers in admission order.
 * @example await soulseekTransfers();
 */
export function soulseekTransfers(): Promise<SoulseekTransfer[]> {
  return requireSoulseek().transfers();
}

/** Delegate soulseek.status to the current runtime.
 * @param transferId Owned transfer handle.
 * @returns One transfer snapshot.
 * @example await soulseekStatus(transferId);
 */
export function soulseekStatus(transferId: string): Promise<SoulseekTransfer> {
  return requireSoulseek().status(transferId);
}

/** Delegate soulseek.pause to the current runtime.
 * @param transferId Owned transfer handle.
 * @returns The paused snapshot.
 * @example await soulseekPause(transferId);
 */
export function soulseekPause(transferId: string): Promise<SoulseekTransfer> {
  return requireSoulseek().pause(transferId);
}

/** Delegate soulseek.resume to the current runtime.
 * @param transferId Owned transfer handle.
 * @returns The re-queued snapshot.
 * @example await soulseekResume(transferId);
 */
export function soulseekResume(transferId: string): Promise<SoulseekTransfer> {
  return requireSoulseek().resume(transferId);
}

/** Delegate soulseek.cancel to the current runtime.
 * @param transferId Owned transfer handle.
 * @returns The cancelled or unchanged terminal snapshot.
 * @example await soulseekCancel(transferId);
 */
export function soulseekCancel(transferId: string): Promise<SoulseekTransfer> {
  return requireSoulseek().cancel(transferId);
}

/** Delegate soulseek.read to the current runtime.
 * @param transferId Owned, complete transfer handle.
 * @param offset Canonical decimal text offset.
 * @param length Positive byte count within the captured `maxReadBytes`.
 * @returns A base64 chunk.
 * @example await soulseekRead(transferId, '0', 65536);
 */
export function soulseekRead(transferId: string, offset: SoulseekByteCount, length: number): Promise<SoulseekChunk> {
  return requireSoulseek().read(transferId, offset, length);
}

/** Delegate soulseek.save to the current runtime.
 * @param transferId Owned, complete transfer handle.
 * @returns `{ saved: true }` after the shell exports the bytes.
 * @example await soulseekSave(transferId);
 */
export function soulseekSave(transferId: string): Promise<SoulseekSaved> {
  return requireSoulseek().save(transferId);
}

/** Delegate soulseek.release to the current runtime.
 * @param kind `"query"` or `"transfer"`.
 * @param handle The owned handle to remove.
 * @returns Whether a live owned handle was removed.
 * @example await soulseekRelease('transfer', transferId);
 */
export function soulseekRelease(kind: SoulseekHandleKind, handle: string): Promise<SoulseekReleased> {
  return requireSoulseek().release(kind, handle);
}
