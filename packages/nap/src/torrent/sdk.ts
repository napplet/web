/** SDK helpers for the runtime-injected NAP-TORRENT domain. @module */
import type { NappletGlobal, NostrEvent, Subscription, TorrentApi } from '@napplet/core';
import type {
  TorrentCapabilities,
  TorrentDescriptor,
  TorrentDescriptorResult,
  TorrentMagnetResult,
  TorrentSearchQuery,
  TorrentSearchResult,
  TorrentPublishRequest,
  TorrentCommentRequest,
  TorrentPublishResult,
  TorrentPickOptions,
  TorrentFileSetResult,
  TorrentAddRequest,
  TorrentJobAck,
  TorrentJobStatus,
  TorrentJobSummary,
  TorrentJobFilter,
  TorrentFileStatus,
  TorrentFileSelection,
  TorrentRemoveOptions,
  TorrentRemoveResult,
  TorrentStateEvent,
  TorrentProgressEvent,
  TorrentErrorEvent,
} from './types.js';

function requireTorrent(): TorrentApi {
  const runtime = (window as Window & { napplet?: NappletGlobal }).napplet;
  if (!runtime?.torrent) throw new Error('window.napplet.torrent is unavailable -- runtime did not inject this domain');
  return runtime.torrent;
}

/** Ask the runtime to perform torrent.capabilities.
 * @returns Runtime capabilities; typed refusals remain resolved values.
 * @example await torrentCapabilities();
 */
export function torrentCapabilities(): Promise<TorrentCapabilities> {
  return requireTorrent().capabilities();
}

/** Ask the runtime to perform torrent.fromEvent.
 * @param event Operation event supplied to the runtime.
 * @returns Runtime result; typed refusals remain resolved values.
 * @example await torrentFromEvent(event);
 */
export function torrentFromEvent(event: NostrEvent): Promise<TorrentDescriptorResult> {
  return requireTorrent().fromEvent(event);
}

/** Ask the runtime to perform torrent.toMagnet.
 * @param descriptor Operation descriptor supplied to the runtime.
 * @returns Runtime result; typed refusals remain resolved values.
 * @example await torrentToMagnet(descriptor);
 */
export function torrentToMagnet(descriptor: TorrentDescriptor): Promise<TorrentMagnetResult> {
  return requireTorrent().toMagnet(descriptor);
}

/** Ask the runtime to perform torrent.search.
 * @param query Operation query supplied to the runtime.
 * @returns Runtime results; typed refusals remain resolved values.
 * @example await torrentSearch(query);
 */
export function torrentSearch(query: TorrentSearchQuery): Promise<TorrentSearchResult[]> {
  return requireTorrent().search(query);
}

/** Ask the runtime to perform torrent.publish.
 * @param request Operation request supplied to the runtime.
 * @returns Runtime result; typed refusals remain resolved values.
 * @example await torrentPublish(request);
 */
export function torrentPublish(request: TorrentPublishRequest): Promise<TorrentPublishResult> {
  return requireTorrent().publish(request);
}

/** Ask the runtime to perform torrent.comment.
 * @param request Operation request supplied to the runtime.
 * @returns Runtime result; typed refusals remain resolved values.
 * @example await torrentComment(request);
 */
export function torrentComment(request: TorrentCommentRequest): Promise<TorrentPublishResult> {
  return requireTorrent().comment(request);
}

/** Ask the runtime to perform torrent.pickFiles.
 * @param options Operation options supplied to the runtime.
 * @returns Runtime result; typed refusals remain resolved values.
 * @example await torrentPickFiles(options);
 */
export function torrentPickFiles(options?: TorrentPickOptions): Promise<TorrentFileSetResult> {
  return requireTorrent().pickFiles(options);
}

/** Ask the runtime to perform torrent.add.
 * @param request Operation request supplied to the runtime.
 * @returns Runtime ack; typed refusals remain resolved values.
 * @example await torrentAdd(request);
 */
export function torrentAdd(request: TorrentAddRequest): Promise<TorrentJobAck> {
  return requireTorrent().add(request);
}

/** Ask the runtime to perform torrent.status.
 * @param jobId Operation jobId supplied to the runtime.
 * @returns Runtime status; typed refusals remain resolved values.
 * @example await torrentStatus(jobId);
 */
export function torrentStatus(jobId: string): Promise<TorrentJobStatus> {
  return requireTorrent().status(jobId);
}

/** Ask the runtime to perform torrent.jobs.
 * @param filter Operation filter supplied to the runtime.
 * @returns Runtime jobs; typed refusals remain resolved values.
 * @example await torrentJobs(filter);
 */
export function torrentJobs(filter?: TorrentJobFilter): Promise<TorrentJobSummary[]> {
  return requireTorrent().jobs(filter);
}

/** Ask the runtime to perform torrent.files.
 * @param jobId Operation jobId supplied to the runtime.
 * @returns Runtime files; typed refusals remain resolved values.
 * @example await torrentFiles(jobId);
 */
export function torrentFiles(jobId: string): Promise<TorrentFileStatus[]> {
  return requireTorrent().files(jobId);
}

/** Ask the runtime to perform torrent.selectFiles.
 * @param jobId Operation jobId supplied to the runtime.
 * @param selection Operation selection supplied to the runtime.
 * @returns Runtime status; typed refusals remain resolved values.
 * @example await torrentSelectFiles(jobId, selection);
 */
export function torrentSelectFiles(jobId: string, selection: TorrentFileSelection): Promise<TorrentJobStatus> {
  return requireTorrent().selectFiles(jobId, selection);
}

/** Ask the runtime to perform torrent.pause.
 * @param jobId Operation jobId supplied to the runtime.
 * @returns Runtime status; typed refusals remain resolved values.
 * @example await torrentPause(jobId);
 */
export function torrentPause(jobId: string): Promise<TorrentJobStatus> {
  return requireTorrent().pause(jobId);
}

/** Ask the runtime to perform torrent.resume.
 * @param jobId Operation jobId supplied to the runtime.
 * @returns Runtime status; typed refusals remain resolved values.
 * @example await torrentResume(jobId);
 */
export function torrentResume(jobId: string): Promise<TorrentJobStatus> {
  return requireTorrent().resume(jobId);
}

/** Ask the runtime to perform torrent.remove.
 * @param jobId Operation jobId supplied to the runtime.
 * @param options Operation options supplied to the runtime.
 * @returns Runtime result; typed refusals remain resolved values.
 * @example await torrentRemove(jobId, options);
 */
export function torrentRemove(jobId: string, options?: TorrentRemoveOptions): Promise<TorrentRemoveResult> {
  return requireTorrent().remove(jobId, options);
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
