/** NAP-NAVIGATION's four report/get envelope types.
 * @see https://github.com/napplet/naps/pull/126
 */
import type { NappletMessage, NavigationReport, NavigationResult } from '@napplet/core';

/** Domain exposed by the runtime. */
export const DOMAIN = 'navigation' as const;
export type { NavigationApi, NavigationJsonValue, NavigationLocation, NavigationReport, NavigationEntry, NavigationView, NavigationError, NavigationResult } from '@napplet/core';

/** Report an actual committed location. */
export interface NavigationReportMessage extends NappletMessage {
  type: 'navigation.report';
  id: string;
  report: NavigationReport;
}

/** Read this endpoint's runtime-owned view. */
export interface NavigationGetMessage extends NappletMessage {
  type: 'navigation.get';
  id: string;
}

/** Correlated report result. */
export interface NavigationReportResultMessage extends NappletMessage {
  type: 'navigation.report.result';
  id: string;
  result: NavigationResult;
}

/** Correlated read result. */
export interface NavigationGetResultMessage extends NappletMessage {
  type: 'navigation.get.result';
  id: string;
  result: NavigationResult;
}

export type NavigationOutboundMessage = NavigationReportMessage | NavigationGetMessage;
export type NavigationInboundMessage = NavigationReportResultMessage | NavigationGetResultMessage;
export type NavigationNapMessage = NavigationOutboundMessage | NavigationInboundMessage;
