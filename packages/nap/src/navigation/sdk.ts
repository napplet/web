/** Application-side helpers for the runtime-injected NAP-NAVIGATION API. */
import type { NappletGlobal, NavigationApi, NavigationReport, NavigationResult } from '@napplet/core';

function requireNavigation(): NavigationApi {
  const napplet = (window as Window & { napplet?: NappletGlobal }).napplet;
  if (!napplet?.navigation) throw new Error('window.napplet.navigation is unavailable -- runtime did not inject this domain');
  return napplet.navigation;
}

/**
 * Report an already committed view through the injected domain.
 * @param report Caller-assigned revision and actual location.
 * @returns Structured acceptance or rejection and retained history.
 * @example await navigationReport({ revision: 1, location: null });
 */
export function navigationReport(report: NavigationReport): Promise<NavigationResult> {
  return requireNavigation().report(report);
}

/**
 * Read this instance's retained history through the injected domain.
 * @returns Structured runtime view result.
 * @example const result = await navigationGet();
 */
export function navigationGet(): Promise<NavigationResult> {
  return requireNavigation().get();
}

export { navigationReport as report, navigationGet as get };
