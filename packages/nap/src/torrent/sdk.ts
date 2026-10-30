/** SDK helpers for the runtime-injected NAP-TORRENT domain. @module */
import type { NappletGlobal, Subscription,
  TorrentAddRequest,
  TorrentApi,
  TorrentCancelResult,
  TorrentCapabilities,
  TorrentErrorEvent,
  TorrentFileActionResult,
  TorrentFileSelection,
  TorrentFileSetResult,
  TorrentFileStatus,
  TorrentJobAck,
  TorrentJobFilter,
  TorrentJobStatus,
  TorrentJobSummary,
  TorrentMetadataResult,
  TorrentMetainfoResult,
  TorrentPendingRequest,
  TorrentPickOptions,
  TorrentProgressEvent,
  TorrentReadRequest,
  TorrentReadResult,
  TorrentRemoveOptions,
  TorrentRemoveResult,
  TorrentSettingsResult,
  TorrentStateEvent,
  TorrentUpdateRequest,
} from '@napplet/core';

function requireTorrent(): TorrentApi {
  const runtime = (window as Window & { napplet?: NappletGlobal }).napplet;
  if (!runtime?.torrent) throw new Error('window.napplet.torrent is unavailable -- runtime did not inject this domain');
  return runtime.torrent;
}

/** Delegate torrent.capabilities to the current runtime.
 * @returns Runtime result.
 * @example await torrentCapabilities();
 */
export function torrentCapabilities(): Promise<TorrentCapabilities> {
  return requireTorrent().capabilities();
}

/** Delegate torrent.pickFiles to the current runtime.
 * @param options Operation argument.
 * @returns Runtime result.
 * @example await torrentPickFiles(options);
 */
export function torrentPickFiles(options?: TorrentPickOptions): Promise<TorrentFileSetResult> {
  return requireTorrent().pickFiles(options);
}

/** Delegate torrent.add to the current runtime.
 * @param request Operation argument.
 * @returns Runtime result.
 * @example await torrentAdd(request);
 */
export function torrentAdd(request: TorrentAddRequest): Promise<TorrentJobAck> {
  return requireTorrent().add(request);
}

/** Delegate torrent.status to the current runtime.
 * @param jobId Operation argument.
 * @returns Runtime result.
 * @example await torrentStatus(jobId);
 */
export function torrentStatus(jobId: string): Promise<TorrentJobStatus> {
  return requireTorrent().status(jobId);
}

/** Delegate torrent.jobs to the current runtime.
 * @param filter Operation argument.
 * @returns Runtime result.
 * @example await torrentJobs(filter);
 */
export function torrentJobs(filter?: TorrentJobFilter): Promise<TorrentJobSummary[]> {
  return requireTorrent().jobs(filter);
}

/** Delegate torrent.files to the current runtime.
 * @param jobId Operation argument.
 * @returns Runtime result.
 * @example await torrentFiles(jobId);
 */
export function torrentFiles(jobId: string): Promise<TorrentFileStatus[]> {
  return requireTorrent().files(jobId);
}

/** Delegate torrent.selectFiles to the current runtime.
 * @param jobId Operation argument.
 * @param selection Operation argument.
 * @returns Runtime result.
 * @example await torrentSelectFiles(jobId, selection);
 */
export function torrentSelectFiles(jobId: string, selection: TorrentFileSelection): Promise<TorrentJobStatus> {
  return requireTorrent().selectFiles(jobId, selection);
}

/** Delegate torrent.pause to the current runtime.
 * @param jobId Operation argument.
 * @returns Runtime result.
 * @example await torrentPause(jobId);
 */
export function torrentPause(jobId: string): Promise<TorrentJobStatus> {
  return requireTorrent().pause(jobId);
}

/** Delegate torrent.resume to the current runtime.
 * @param jobId Operation argument.
 * @returns Runtime result.
 * @example await torrentResume(jobId);
 */
export function torrentResume(jobId: string): Promise<TorrentJobStatus> {
  return requireTorrent().resume(jobId);
}

/** Delegate torrent.remove to the current runtime.
 * @param jobId Operation argument.
 * @param options Operation argument.
 * @returns Runtime result.
 * @example await torrentRemove(jobId, options);
 */
export function torrentRemove(jobId: string, options?: TorrentRemoveOptions): Promise<TorrentRemoveResult> {
  return requireTorrent().remove(jobId, options);
}

/** Delegate torrent.metadata to the current runtime.
 * @param jobId Operation argument.
 * @returns Runtime result.
 * @example await torrentMetadata(jobId);
 */
export function torrentMetadata(jobId: string): Promise<TorrentMetadataResult> {
  return requireTorrent().metadata(jobId);
}

/** Delegate torrent.read to the current runtime.
 * @param request Operation argument.
 * @returns Runtime result.
 * @example await torrentRead(request);
 */
export function torrentRead(request: TorrentReadRequest): TorrentPendingRequest<TorrentReadResult> {
  return requireTorrent().read(request);
}

/** Delegate torrent.exportMetainfo to the current runtime.
 * @param jobId Operation argument.
 * @returns Runtime result.
 * @example await torrentExportMetainfo(jobId);
 */
export function torrentExportMetainfo(jobId: string): TorrentPendingRequest<TorrentMetainfoResult> {
  return requireTorrent().exportMetainfo(jobId);
}

/** Delegate torrent.saveFile to the current runtime.
 * @param jobId Operation argument.
 * @param fileIndex Operation argument.
 * @returns Runtime result.
 * @example await torrentSaveFile(jobId, fileIndex);
 */
export function torrentSaveFile(jobId: string, fileIndex: number): TorrentPendingRequest<TorrentFileActionResult> {
  return requireTorrent().saveFile(jobId, fileIndex);
}

/** Delegate torrent.openFile to the current runtime.
 * @param jobId Operation argument.
 * @param fileIndex Operation argument.
 * @returns Runtime result.
 * @example await torrentOpenFile(jobId, fileIndex);
 */
export function torrentOpenFile(jobId: string, fileIndex: number): Promise<TorrentFileActionResult> {
  return requireTorrent().openFile(jobId, fileIndex);
}

/** Delegate torrent.cancel to the current runtime.
 * @param requestId Operation argument.
 * @returns Runtime result.
 * @example await torrentCancel(requestId);
 */
export function torrentCancel(requestId: string): Promise<TorrentCancelResult> {
  return requireTorrent().cancel(requestId);
}

/** Delegate torrent.update to the current runtime.
 * @param request Operation argument.
 * @returns Runtime result.
 * @example await torrentUpdate(request);
 */
export function torrentUpdate(request: TorrentUpdateRequest): Promise<TorrentSettingsResult> {
  return requireTorrent().update(request);
}

/** Listen for torrent job state notifications.
 * @param handler Receives the job-scoped notification.
 * @returns A local listener subscription; close sends no wire message.
 * @example const subscription = torrentOnState(event => console.log(event.jobId));
 */
export function torrentOnState(handler: (event: TorrentStateEvent) => void): Subscription {
  return requireTorrent().onState(handler);
}

/** Listen for torrent job progress notifications.
 * @param handler Receives the job-scoped notification.
 * @returns A local listener subscription; close sends no wire message.
 * @example const subscription = torrentOnProgress(event => console.log(event.jobId));
 */
export function torrentOnProgress(handler: (event: TorrentProgressEvent) => void): Subscription {
  return requireTorrent().onProgress(handler);
}

/** Listen for torrent job error notifications.
 * @param handler Receives the job-scoped notification.
 * @returns A local listener subscription; close sends no wire message.
 * @example const subscription = torrentOnError(event => console.log(event.jobId));
 */
export function torrentOnError(handler: (event: TorrentErrorEvent) => void): Subscription {
  return requireTorrent().onError(handler);
}
