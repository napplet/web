/**
 * @napplet/nap/ifc -- deprecated compatibility barrel for NAP-INC.
 *
 * @deprecated Use `@napplet/nap/inc`. The canonical domain, wire messages, and
 * runtime namespace are `inc`.
 */

export { DOMAIN } from '../inc/types.js';

export type {
  IncMessage as IfcMessage,
  IncEmitMessage as IfcEmitMessage,
  IncSubscribeMessage as IfcSubscribeMessage,
  IncSubscribeResultMessage as IfcSubscribeResultMessage,
  IncUnsubscribeMessage as IfcUnsubscribeMessage,
  IncEventMessage as IfcEventMessage,
  IncChannelOpenMessage as IfcChannelOpenMessage,
  IncChannelOpenResultMessage as IfcChannelOpenResultMessage,
  IncChannelEmitMessage as IfcChannelEmitMessage,
  IncChannelEventMessage as IfcChannelEventMessage,
  IncChannelBroadcastMessage as IfcChannelBroadcastMessage,
  IncChannelListMessage as IfcChannelListMessage,
  IncChannelListResultMessage as IfcChannelListResultMessage,
  IncChannelCloseMessage as IfcChannelCloseMessage,
  IncChannelClosedMessage as IfcChannelClosedMessage,
  IncTopicMessage as IfcTopicMessage,
  IncChannelMessage as IfcChannelMessage,
  IncOutboundMessage as IfcOutboundMessage,
  IncInboundMessage as IfcInboundMessage,
  IncNapMessage as IfcNapMessage,
} from '../inc/types.js';

export {
  installIncShim as installIfcShim,
  handleIncEvent as handleIfcEvent,
  emit,
  on,
} from '../inc/shim.js';

export {
  incEmit as ifcEmit,
  incOn as ifcOn,
} from '../inc/sdk.js';

