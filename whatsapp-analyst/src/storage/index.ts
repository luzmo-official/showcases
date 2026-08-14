import type { MessageStore } from './types.js';
import type { AppConfig } from '../config.js';
import { resolvePath } from '../config.js';

/**
 * Creates the configured message store.
 * SQLite / DynamoDB are loaded dynamically so the Lambda bundle can avoid
 * evaluating `node:sqlite` when STORAGE_BACKEND=dynamodb.
 */
export async function createMessageStore(
  config: AppConfig
): Promise<MessageStore> {
  if (config.STORAGE_BACKEND === 'dynamodb') {
    if (!config.DYNAMODB_TABLE_NAME) {
      throw new Error(
        'DYNAMODB_TABLE_NAME is required when STORAGE_BACKEND=dynamodb'
      );
    }
    const { DynamoDbStore } = await import('./dynamodb-store.js');
    return new DynamoDbStore({
      tableName: config.DYNAMODB_TABLE_NAME,
      region: config.AWS_REGION,
    });
  }

  const { SqliteStore } = await import('./sqlite.js');
  return new SqliteStore(resolvePath(config.SQLITE_PATH));
}

export type {
  MessageStore,
  InboundMessageRow,
  ConversationRow,
  MessageStatus,
} from './types.js';
