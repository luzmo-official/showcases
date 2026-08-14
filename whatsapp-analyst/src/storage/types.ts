export type MessageStatus = 'received' | 'processing' | 'completed' | 'failed';

export interface InboundMessageRow {
  message_id: string;
  identity_key: string;
  message_text: string;
  received_at: string;
  processing_started_at: string | null;
  completed_at: string | null;
  status: MessageStatus;
  error_code: string | null;
}

export interface ConversationRow {
  identity_key: string;
  luzmo_conversation_id: string;
  last_activity_at: string;
}

/**
 * Persistence for wamid dedupe + Luzmo conversation continuity.
 * Implementations may be sync-backed (SQLite) or remote (DynamoDB).
 */
export interface MessageStore {
  tryInsertInbound(input: {
    messageId: string;
    identityKey: string;
    messageText: string;
  }): Promise<boolean>;

  markProcessing(messageId: string): Promise<void>;
  markCompleted(messageId: string): Promise<void>;
  markFailed(messageId: string, errorCode: string): Promise<void>;

  getInbound(messageId: string): Promise<InboundMessageRow | null>;
  /** Local SQLite recovery only — DynamoDB returns []. */
  listRecoverable(staleProcessingMs: number): Promise<InboundMessageRow[]>;

  getConversation(identityKey: string): Promise<ConversationRow | null>;
  setConversation(identityKey: string, conversationId: string): Promise<void>;
  touchConversation(identityKey: string): Promise<void>;
  clearConversation(identityKey: string): Promise<void>;
  getActiveConversationId(
    identityKey: string,
    idleMs: number
  ): Promise<string | undefined>;

  close(): void;
}
