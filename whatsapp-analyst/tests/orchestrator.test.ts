import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/storage/sqlite.js';
import { KeyedQueue } from '../src/core/keyed-queue.js';

describe('sqlite store', () => {
  let dir: string;
  let store: Store;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'wa-iq-'));
    store = new Store(join(dir, 'test.sqlite'));
  });

  afterEach(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('deduplicates by wamid', async () => {
    expect(
      await store.tryInsertInbound({
        messageId: 'wamid.1',
        identityKey: '+32470000001',
        messageText: 'hello',
      })
    ).toBe(true);
    expect(
      await store.tryInsertInbound({
        messageId: 'wamid.1',
        identityKey: '+32470000001',
        messageText: 'hello again',
      })
    ).toBe(false);
  });

  it('tracks conversation idle window', async () => {
    await store.setConversation('+32470000001', 'conv-1');
    expect(await store.getActiveConversationId('+32470000001', 60_000)).toBe(
      'conv-1'
    );
    await store.clearConversation('+32470000001');
    expect(
      await store.getActiveConversationId('+32470000001', 60_000)
    ).toBeUndefined();
  });

  it('recovers received work', async () => {
    await store.tryInsertInbound({
      messageId: 'wamid.2',
      identityKey: '+32470000001',
      messageText: 'q',
    });
    const rows = await store.listRecoverable(5 * 60 * 1000);
    expect(rows.some((r) => r.message_id === 'wamid.2')).toBe(true);
  });
});

describe('keyed queue', () => {
  it('runs tasks for one key in order', async () => {
    const queue = new KeyedQueue();
    const order: number[] = [];
    await Promise.all([
      queue.enqueue('a', async () => {
        await new Promise((r) => setTimeout(r, 30));
        order.push(1);
      }),
      queue.enqueue('a', async () => {
        order.push(2);
      }),
    ]);
    expect(order).toEqual([1, 2]);
  });
});
