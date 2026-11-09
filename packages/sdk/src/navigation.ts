/** Application-side NAP-NAVIGATION; inspect domain availability before use. */
import type { NavigationApi, NavigationReport, NavigationResult } from '@napplet/core';
import { requireDomain } from './require-napplet.js';

/**
 * Report committed locations and read runtime-owned history.
 * @example import { navigation } from '@napplet/sdk/navigation';
 */
export const navigation: NavigationApi = {
  /**
   * Report an actual committed view.
   * @param report Caller-assigned monotonic revision and committed location.
   * @returns Acceptance or rejection with the retained view.
   * @example await navigation.report({ revision: 1, location: null });
   */
  report(report: NavigationReport): Promise<NavigationResult> {
    return requireDomain('navigation').report(report);
  },
  /**
   * Read this running instance's complete retained history.
   * @returns Structured runtime view result.
   * @example const result = await navigation.get();
   */
  get(): Promise<NavigationResult> {
    return requireDomain('navigation').get();
  },
};

export type { NavigationApi, NavigationJsonValue, NavigationLocation, NavigationReport, NavigationEntry, NavigationView, NavigationError, NavigationResult } from '@napplet/core';
export { navigationReport, navigationGet, report, get } from '@napplet/nap/navigation/sdk';
