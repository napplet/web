/** Optional NAP-SHELL wire surface. See the living NAP-SHELL document. */
export type { ShellApi, ShellCapabilities, ShellEnvironment } from '@napplet/core';
import type { ShellEnvironment } from '@napplet/core';
export const DOMAIN = 'shell' as const;
export interface ShellReadyMessage {
  type: 'shell.ready';
}
export interface ShellInitMessage extends ShellEnvironment {
  type: 'shell.init';
}
export type ShellOutboundMessage = ShellReadyMessage;
export type ShellInboundMessage = ShellInitMessage;
export type ShellNapMessage = ShellOutboundMessage | ShellInboundMessage;
