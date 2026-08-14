import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { logger } from '../logger.js';
import type {
  ConversationRow,
  InboundMessageRow,
  MessageStore,
  MessageStatus,
} from './types.js';

type InboundItem = {
  pk: string;
  entity: 'inbound';
  message_id: string;
  identity_key: string;
  message_text: string;
  received_at: string;
  processing_started_at?: string | null;
  completed_at?: string | null;
  status: MessageStatus;
  error_code?: string | null;
};

type ConversationItem = {
  pk: string;
  entity: 'conversation';
  identity_key: string;
  luzmo_conversation_id: string;
  last_activity_at: string;
};

function inboundPk(messageId: string): string {
  return `inbound#${messageId}`;
}

function conversationPk(identityKey: string): string {
  return `conversation#${identityKey}`;
}

/**
 * DynamoDB-backed store for Lambda.
 * Table: single-table design with string partition key `pk`.
 * listRecoverable is a no-op (returns []) — Lambda has no long-lived process recovery.
 */
export class DynamoDbStore implements MessageStore {
  private readonly doc: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor(opts: { tableName: string; region?: string }) {
    this.tableName = opts.tableName;
    const client = new DynamoDBClient(
      opts.region ? { region: opts.region } : {}
    );
    this.doc = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }

  async tryInsertInbound(input: {
    messageId: string;
    identityKey: string;
    messageText: string;
  }): Promise<boolean> {
    const item: InboundItem = {
      pk: inboundPk(input.messageId),
      entity: 'inbound',
      message_id: input.messageId,
      identity_key: input.identityKey,
      message_text: input.messageText,
      received_at: new Date().toISOString(),
      status: 'received',
    };
    try {
      await this.doc.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item,
          ConditionExpression: 'attribute_not_exists(pk)',
        })
      );
      return true;
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      if (name === 'ConditionalCheckFailedException') {
        return false;
      }
      throw error;
    }
  }

  async markProcessing(messageId: string): Promise<void> {
    await this.doc.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { pk: inboundPk(messageId) },
        UpdateExpression:
          'SET #status = :status, processing_started_at = :started',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': 'processing',
          ':started': new Date().toISOString(),
        },
      })
    );
  }

  async markCompleted(messageId: string): Promise<void> {
    await this.doc.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { pk: inboundPk(messageId) },
        UpdateExpression:
          'SET #status = :status, completed_at = :completed REMOVE error_code',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': 'completed',
          ':completed': new Date().toISOString(),
        },
      })
    );
  }

  async markFailed(messageId: string, errorCode: string): Promise<void> {
    await this.doc.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { pk: inboundPk(messageId) },
        UpdateExpression:
          'SET #status = :status, completed_at = :completed, error_code = :code',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': 'failed',
          ':completed': new Date().toISOString(),
          ':code': errorCode.slice(0, 200),
        },
      })
    );
  }

  async getInbound(messageId: string): Promise<InboundMessageRow | null> {
    const result = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk: inboundPk(messageId) },
      })
    );
    const item = result.Item as InboundItem | undefined;
    if (!item || item.entity !== 'inbound') return null;
    return {
      message_id: item.message_id,
      identity_key: item.identity_key,
      message_text: item.message_text,
      received_at: item.received_at,
      processing_started_at: item.processing_started_at ?? null,
      completed_at: item.completed_at ?? null,
      status: item.status,
      error_code: item.error_code ?? null,
    };
  }

  async listRecoverable(_staleProcessingMs: number): Promise<InboundMessageRow[]> {
    return [];
  }

  async getConversation(identityKey: string): Promise<ConversationRow | null> {
    const result = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk: conversationPk(identityKey) },
      })
    );
    const item = result.Item as ConversationItem | undefined;
    if (!item || item.entity !== 'conversation') return null;
    return {
      identity_key: item.identity_key,
      luzmo_conversation_id: item.luzmo_conversation_id,
      last_activity_at: item.last_activity_at,
    };
  }

  async setConversation(
    identityKey: string,
    conversationId: string
  ): Promise<void> {
    const item: ConversationItem = {
      pk: conversationPk(identityKey),
      entity: 'conversation',
      identity_key: identityKey,
      luzmo_conversation_id: conversationId,
      last_activity_at: new Date().toISOString(),
    };
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      })
    );
  }

  async touchConversation(identityKey: string): Promise<void> {
    await this.doc.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { pk: conversationPk(identityKey) },
        UpdateExpression: 'SET last_activity_at = :ts',
        ExpressionAttributeValues: { ':ts': new Date().toISOString() },
      })
    );
  }

  async clearConversation(identityKey: string): Promise<void> {
    await this.doc.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { pk: conversationPk(identityKey) },
      })
    );
  }

  async getActiveConversationId(
    identityKey: string,
    idleMs: number
  ): Promise<string | undefined> {
    const row = await this.getConversation(identityKey);
    if (!row) return undefined;
    const last = Date.parse(row.last_activity_at);
    if (Number.isNaN(last) || Date.now() - last > idleMs) {
      return undefined;
    }
    return row.luzmo_conversation_id;
  }

  close(): void {
    try {
      this.doc.destroy();
    } catch (error) {
      logger.warn('Failed to close DynamoDB client', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
