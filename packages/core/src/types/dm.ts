/** Hex-encoded Nostr public key. */
export type DmHexPubkey = string;

/** Unix timestamp in seconds. */
export type DmTimestamp = number;

/** Current runtime direct-message availability. */
export interface DmStatus {
  available: boolean;
  ownerPubkey?: DmHexPubkey;
  implementations: string[];
  capabilities: string[];
}

/** Query parameters for normalized DM conversation summaries. */
export interface DmConversationQuery {
  cursor?: string;
  limit?: number;
}

/** Public peer metadata safe for napplet display. */
export interface DmPeer {
  pubkey: DmHexPubkey;
  label?: string;
  avatar?: string;
}

/** A normalized direct or group conversation summary. */
export interface DmConversation {
  id: string;
  kind: 'direct' | 'group';
  participants: DmPeer[];
  subject?: string;
  unread: number;
  updatedAt?: DmTimestamp;
}

/** Page of normalized conversation summaries. */
export interface DmConversationPage {
  conversations: DmConversation[];
  cursor?: string;
}

/** Query parameters for message history within one conversation. */
export interface DmMessageQuery {
  conversationId: string;
  cursor?: string;
  limit?: number;
}

/** Runtime-normalized delivery state for a DM message. */
export type DmMessageStatus = 'sent' | 'delivered' | 'received' | 'failed';

/** Normalized cleartext message visible to the napplet by runtime policy. */
export interface DmMessage {
  id: string;
  conversationId: string;
  senderPubkey: DmHexPubkey;
  createdAt: DmTimestamp;
  content: string;
  status: DmMessageStatus;
}

/** Page of normalized messages for one conversation. */
export interface DmMessagePage {
  messages: DmMessage[];
  cursor?: string;
}

/** Request to send a direct message. */
export interface DmSendRequest {
  conversationId?: string;
  recipients: DmHexPubkey[];
  content: string;
  clientMessageId?: string;
}

/** Result of a runtime-mediated send. */
export interface DmSendResult {
  ok: boolean;
  message: DmMessage;
}

/** Request to start live DM delivery. */
export interface DmSubscribeRequest {
  conversationId?: string;
}

/** Runtime-assigned live subscription identity. */
export interface DmSubscription {
  subscriptionId: string;
}

/** Generic boolean acknowledgement used by `dm.unsubscribe`. */
export interface DmOk {
  ok: boolean;
}

/** Error payload returned when a DM request cannot be fulfilled. */
export interface DmError {
  error: string;
}
