/** Runtime-mediated Soulseek discovery and downloads. The runtime owns the account, network, storage, and consent. @module */
import type { SoulseekApi } from '@napplet/core';
import { requireDomain } from './require-napplet.js';

/**
 * Delegate soulseek operations to the current injected runtime.
 * @example const owned = await soulseek.transfers();
 */
export const soulseek: SoulseekApi = {
  /** Delegate `info`. @returns Runtime result. */
  info(): ReturnType<SoulseekApi['info']> {
    return requireDomain('soulseek').info();
  },
  /** Delegate `search`. @param args Operation arguments. @returns Runtime result. */
  search(...args: Parameters<SoulseekApi['search']>): ReturnType<SoulseekApi['search']> {
    return requireDomain('soulseek').search(...args);
  },
  /** Delegate `browse`. @param args Operation arguments. @returns Runtime result. */
  browse(...args: Parameters<SoulseekApi['browse']>): ReturnType<SoulseekApi['browse']> {
    return requireDomain('soulseek').browse(...args);
  },
  /** Delegate `results`. @param args Operation arguments. @returns Runtime result. */
  results(...args: Parameters<SoulseekApi['results']>): ReturnType<SoulseekApi['results']> {
    return requireDomain('soulseek').results(...args);
  },
  /** Delegate `stop`. @param args Operation arguments. @returns Runtime result. */
  stop(...args: Parameters<SoulseekApi['stop']>): ReturnType<SoulseekApi['stop']> {
    return requireDomain('soulseek').stop(...args);
  },
  /** Delegate `download`. @param args Operation arguments. @returns Runtime result. */
  download(...args: Parameters<SoulseekApi['download']>): ReturnType<SoulseekApi['download']> {
    return requireDomain('soulseek').download(...args);
  },
  /** Delegate `transfers`. @returns Runtime result. */
  transfers(): ReturnType<SoulseekApi['transfers']> {
    return requireDomain('soulseek').transfers();
  },
  /** Delegate `status`. @param args Operation arguments. @returns Runtime result. */
  status(...args: Parameters<SoulseekApi['status']>): ReturnType<SoulseekApi['status']> {
    return requireDomain('soulseek').status(...args);
  },
  /** Delegate `pause`. @param args Operation arguments. @returns Runtime result. */
  pause(...args: Parameters<SoulseekApi['pause']>): ReturnType<SoulseekApi['pause']> {
    return requireDomain('soulseek').pause(...args);
  },
  /** Delegate `resume`. @param args Operation arguments. @returns Runtime result. */
  resume(...args: Parameters<SoulseekApi['resume']>): ReturnType<SoulseekApi['resume']> {
    return requireDomain('soulseek').resume(...args);
  },
  /** Delegate `cancel`. @param args Operation arguments. @returns Runtime result. */
  cancel(...args: Parameters<SoulseekApi['cancel']>): ReturnType<SoulseekApi['cancel']> {
    return requireDomain('soulseek').cancel(...args);
  },
  /** Delegate `read`. @param args Operation arguments. @returns Runtime result. */
  read(...args: Parameters<SoulseekApi['read']>): ReturnType<SoulseekApi['read']> {
    return requireDomain('soulseek').read(...args);
  },
  /** Delegate `save`. @param args Operation arguments. @returns Runtime result. */
  save(...args: Parameters<SoulseekApi['save']>): ReturnType<SoulseekApi['save']> {
    return requireDomain('soulseek').save(...args);
  },
  /** Delegate `release`. @param args Operation arguments. @returns Runtime result. */
  release(...args: Parameters<SoulseekApi['release']>): ReturnType<SoulseekApi['release']> {
    return requireDomain('soulseek').release(...args);
  },
};

export type * from '@napplet/nap/soulseek/types';
export { SOULSEEK_ERROR_CODES } from '@napplet/nap/soulseek/types';
export {
  isSoulseekFailure,
  soulseekInfo,
  soulseekInfo as info,
  soulseekSearch,
  soulseekSearch as search,
  soulseekBrowse,
  soulseekBrowse as browse,
  soulseekResults,
  soulseekResults as results,
  soulseekStop,
  soulseekStop as stop,
  soulseekDownload,
  soulseekDownload as download,
  soulseekTransfers,
  soulseekTransfers as transfers,
  soulseekStatus,
  soulseekStatus as status,
  soulseekPause,
  soulseekPause as pause,
  soulseekResume,
  soulseekResume as resume,
  soulseekCancel,
  soulseekCancel as cancel,
  soulseekRead,
  soulseekRead as read,
  soulseekSave,
  soulseekSave as save,
  soulseekRelease,
  soulseekRelease as release,
} from '@napplet/nap/soulseek/sdk';
