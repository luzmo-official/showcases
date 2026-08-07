import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { logger } from '../logger.js';

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

export class Store {
  private readonly db: DatabaseSync;

  constructor(sqlitePath: string) {
    mkdirSync(dirname(sqlitePath), { recursive: true });
    this.db = new DatabaseSync(sqlitePath);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS inbound_messages (
        message_id TEXT PRIMARY KEY,
        identity_key TEXT NOT NULL,
        message_text TEXT NOT NULL,
        received_at TEXT NOT NULL,
        processing_started_at TEXT,
        completed_at TEXT,
        status TEXT NOT NULL CHECK(status IN ('received','processing','completed','failed')),
        error_code TEXT
      );

      CREATE TABLE IF NOT EXISTS conversations (
        identity_key TEXT PRIMARY KEY,
        luzmo_conversation_id TEXT NOT NULL,
        last_activity_at TEXT NOT NULL
      );
    `);
  }

  /**
   * Inserts a new inbound work item. Returns false if wamid already exists.
   */
  tryInsertInbound(input: {
    messageId: string;
    identityKey: string;
    messageText: string;
  }): boolean {
    try {
      this.db
        .prepare(
          `INSERT INTO inbound_messages
            (message_id, identity_key, message_text, received_at, status)
           VALUES (?, ?, ?, ?, 'received')`
        )
        .run(
          input.messageId,
          input.identityKey,
          input.messageText,
          new Date().toISOString()
        );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('UNIQUE') || message.includes('unique')) {
        return false;
      }
      throw error;
    }
  }

  markProcessing(messageId: string): void {
    this.db
      .prepare(
        `UPDATE inbound_messages
         SET status = 'processing', processing_started_at = ?
         WHERE message_id = ?`
      )
      .run(new Date().toISOString(), messageId);
  }

  markCompleted(messageId: string): void {
    this.db
      .prepare(
        `UPDATE inbound_messages
         SET status = 'completed', completed_at = ?, error_code = NULL
         WHERE message_id = ?`
      )
      .run(new Date().toISOString(), messageId);
  }

  markFailed(messageId: string, errorCode: string): void {
    this.db
      .prepare(
        `UPDATE inbound_messages
         SET status = 'failed', completed_at = ?, error_code = ?
         WHERE message_id = ?`
      )
      .run(new Date().toISOString(), errorCode.slice(0, 200), messageId);
  }

  getInbound(messageId: string): InboundMessageRow | null {
    return (
      (this.db
        .prepare(`SELECT * FROM inbound_messages WHERE message_id = ?`)
        .get(messageId) as unknown as InboundMessageRow | undefined) ?? null
    );
  }

  listRecoverable(staleProcessingMs: number): InboundMessageRow[] {
    const cutoff = new Date(Date.now() - staleProcessingMs).toISOString();
    const rows = this.db
      .prepare(
        `SELECT * FROM inbound_messages
         WHERE status = 'received'
            OR (status = 'processing' AND processing_started_at IS NOT NULL AND processing_started_at < ?)
         ORDER BY received_at ASC`
      )
      .all(cutoff) as unknown as InboundMessageRow[];

    for (const row of rows) {
      if (row.status === 'processing') {
        this.db
          .prepare(
            `UPDATE inbound_messages
             SET status = 'received', processing_started_at = NULL
             WHERE message_id = ?`
          )
          .run(row.message_id);
        row.status = 'received';
        row.processing_started_at = null;
      }
    }
    return rows;
  }

  getConversation(identityKey: string): ConversationRow | null {
    return (
      (this.db
        .prepare(`SELECT * FROM conversations WHERE identity_key = ?`)
        .get(identityKey) as ConversationRow | undefined) ?? null
    );
  }

  setConversation(identityKey: string, conversationId: string): void {
    this.db
      .prepare(
        `INSERT INTO conversations (identity_key, luzmo_conversation_id, last_activity_at)
         VALUES (?, ?, ?)
         ON CONFLICT(identity_key) DO UPDATE SET
           luzmo_conversation_id = excluded.luzmo_conversation_id,
           last_activity_at = excluded.last_activity_at`
      )
      .run(identityKey, conversationId, new Date().toISOString());
  }

  touchConversation(identityKey: string): void {
    this.db
      .prepare(
        `UPDATE conversations SET last_activity_at = ? WHERE identity_key = ?`
      )
      .run(new Date().toISOString(), identityKey);
  }

  clearConversation(identityKey: string): void {
    this.db
      .prepare(`DELETE FROM conversations WHERE identity_key = ?`)
      .run(identityKey);
  }

  /**
   * Returns conversation_id when last activity is within idleMs.
   */
  getActiveConversationId(
    identityKey: string,
    idleMs: number
  ): string | undefined {
    const row = this.getConversation(identityKey);
    if (!row) return undefined;
    const last = Date.parse(row.last_activity_at);
    if (Number.isNaN(last) || Date.now() - last > idleMs) {
      return undefined;
    }
    return row.luzmo_conversation_id;
  }

  close(): void {
    try {
      this.db.close();
    } catch (error) {
      logger.warn('Failed to close sqlite', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
