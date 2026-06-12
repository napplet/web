/**
 * @napplet/nap/ifc -- deprecated compatibility types for NAP-INC.
 *
 * @deprecated Use `@napplet/nap/inc/types`. The protocol was renamed from
 * NAP-IFC (Inter-Frame Communication) to NAP-INC
 * (Inter-Napplet Communication).
 */

export {
  DOMAIN,
} from '../inc/types.js';

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

