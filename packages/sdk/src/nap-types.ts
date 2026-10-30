/**
 * @napplet/sdk -- Type-only re-exports from `@napplet/core` and `@napplet/nap/*`.
 *
 * @packageDocumentation
 */

export type * from './nap-types-foundation.js';
export type * from './nap-types-services.js';
export type * from './nap-types-devices.js';

export type { ShellApi, ShellCapabilities, ShellEnvironment } from '@napplet/core';

export type * from '@napplet/nap/gamepad/types';
export type {
  NavigationApi, NavigationJsonValue, NavigationLocation, NavigationReport,
  NavigationEntry, NavigationView, NavigationError, NavigationResult,
  NavigationReportMessage, NavigationGetMessage, NavigationReportResultMessage,
  NavigationGetResultMessage, NavigationOutboundMessage, NavigationInboundMessage,
  NavigationNapMessage,
} from '@napplet/nap/navigation/types';
