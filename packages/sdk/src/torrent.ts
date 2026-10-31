/** Runtime-mediated transfers. The runtime owns networking, policy, storage, and content disclosure. @module */
import type { TorrentApi } from '@napplet/core';
import { requireDomain } from './require-napplet.js';

/**
 * Delegate torrent operations to the current injected runtime.
 * @example const jobs = await torrent.jobs();
 */
export const torrent: TorrentApi = {
  /** Delegate `capabilities`. @param args Operation arguments. @returns Runtime result. */
  capabilities(...args: Parameters<TorrentApi['capabilities']>): ReturnType<TorrentApi['capabilities']> {
    return requireDomain('torrent').capabilities(...args);
  },
  /** Delegate `pickFiles`. @param args Operation arguments. @returns Runtime result. */
  pickFiles(...args: Parameters<TorrentApi['pickFiles']>): ReturnType<TorrentApi['pickFiles']> {
    return requireDomain('torrent').pickFiles(...args);
  },
  /** Delegate `add`. @param args Operation arguments. @returns Runtime result. */
  add(...args: Parameters<TorrentApi['add']>): ReturnType<TorrentApi['add']> {
    return requireDomain('torrent').add(...args);
  },
  /** Delegate `status`. @param args Operation arguments. @returns Runtime result. */
  status(...args: Parameters<TorrentApi['status']>): ReturnType<TorrentApi['status']> {
    return requireDomain('torrent').status(...args);
  },
  /** Delegate `jobs`. @param args Operation arguments. @returns Runtime result. */
  jobs(...args: Parameters<TorrentApi['jobs']>): ReturnType<TorrentApi['jobs']> {
    return requireDomain('torrent').jobs(...args);
  },
  /** Delegate `files`. @param args Operation arguments. @returns Runtime result. */
  files(...args: Parameters<TorrentApi['files']>): ReturnType<TorrentApi['files']> {
    return requireDomain('torrent').files(...args);
  },
  /** Delegate `selectFiles`. @param args Operation arguments. @returns Runtime result. */
  selectFiles(...args: Parameters<TorrentApi['selectFiles']>): ReturnType<TorrentApi['selectFiles']> {
    return requireDomain('torrent').selectFiles(...args);
  },
  /** Delegate `pause`. @param args Operation arguments. @returns Runtime result. */
  pause(...args: Parameters<TorrentApi['pause']>): ReturnType<TorrentApi['pause']> {
    return requireDomain('torrent').pause(...args);
  },
  /** Delegate `resume`. @param args Operation arguments. @returns Runtime result. */
  resume(...args: Parameters<TorrentApi['resume']>): ReturnType<TorrentApi['resume']> {
    return requireDomain('torrent').resume(...args);
  },
  /** Delegate `remove`. @param args Operation arguments. @returns Runtime result. */
  remove(...args: Parameters<TorrentApi['remove']>): ReturnType<TorrentApi['remove']> {
    return requireDomain('torrent').remove(...args);
  },
  /** Delegate `metadata`. @param args Operation arguments. @returns Runtime result. */
  metadata(...args: Parameters<TorrentApi['metadata']>): ReturnType<TorrentApi['metadata']> {
    return requireDomain('torrent').metadata(...args);
  },
  /** Delegate `read`. @param args Operation arguments. @returns Runtime result. */
  read(...args: Parameters<TorrentApi['read']>): ReturnType<TorrentApi['read']> {
    return requireDomain('torrent').read(...args);
  },
  /** Delegate `exportMetainfo`. @param args Operation arguments. @returns Runtime result. */
  exportMetainfo(...args: Parameters<TorrentApi['exportMetainfo']>): ReturnType<TorrentApi['exportMetainfo']> {
    return requireDomain('torrent').exportMetainfo(...args);
  },
  /** Delegate `saveFile`. @param args Operation arguments. @returns Runtime result. */
  saveFile(...args: Parameters<TorrentApi['saveFile']>): ReturnType<TorrentApi['saveFile']> {
    return requireDomain('torrent').saveFile(...args);
  },
  /** Delegate `openFile`. @param args Operation arguments. @returns Runtime result. */
  openFile(...args: Parameters<TorrentApi['openFile']>): ReturnType<TorrentApi['openFile']> {
    return requireDomain('torrent').openFile(...args);
  },
  /** Delegate `cancel`. @param args Operation arguments. @returns Runtime result. */
  cancel(...args: Parameters<TorrentApi['cancel']>): ReturnType<TorrentApi['cancel']> {
    return requireDomain('torrent').cancel(...args);
  },
  /** Delegate `update`. @param args Operation arguments. @returns Runtime result. */
  update(...args: Parameters<TorrentApi['update']>): ReturnType<TorrentApi['update']> {
    return requireDomain('torrent').update(...args);
  },
  /** Delegate `onState`. @param args Operation arguments. @returns Runtime result. */
  onState(...args: Parameters<TorrentApi['onState']>): ReturnType<TorrentApi['onState']> {
    return requireDomain('torrent').onState(...args);
  },
  /** Delegate `onProgress`. @param args Operation arguments. @returns Runtime result. */
  onProgress(...args: Parameters<TorrentApi['onProgress']>): ReturnType<TorrentApi['onProgress']> {
    return requireDomain('torrent').onProgress(...args);
  },
  /** Delegate `onError`. @param args Operation arguments. @returns Runtime result. */
  onError(...args: Parameters<TorrentApi['onError']>): ReturnType<TorrentApi['onError']> {
    return requireDomain('torrent').onError(...args);
  },
};

export type * from '@napplet/nap/torrent/types';
export {
  torrentCapabilities,
  torrentCapabilities as capabilities,
  torrentPickFiles,
  torrentPickFiles as pickFiles,
  torrentAdd,
  torrentAdd as add,
  torrentStatus,
  torrentStatus as status,
  torrentJobs,
  torrentJobs as jobs,
  torrentFiles,
  torrentFiles as files,
  torrentSelectFiles,
  torrentSelectFiles as selectFiles,
  torrentPause,
  torrentPause as pause,
  torrentResume,
  torrentResume as resume,
  torrentRemove,
  torrentRemove as remove,
  torrentMetadata,
  torrentMetadata as metadata,
  torrentRead,
  torrentRead as read,
  torrentExportMetainfo,
  torrentExportMetainfo as exportMetainfo,
  torrentSaveFile,
  torrentSaveFile as saveFile,
  torrentOpenFile,
  torrentOpenFile as openFile,
  torrentCancel,
  torrentCancel as cancel,
  torrentUpdate,
  torrentUpdate as update,
  torrentOnState,
  torrentOnState as onState,
  torrentOnProgress,
  torrentOnProgress as onProgress,
  torrentOnError,
  torrentOnError as onError,
} from '@napplet/nap/torrent/sdk';
