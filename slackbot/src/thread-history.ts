interface ThreadEntry {
  conversationId: string;
  lastAccess: number;
}

const TTL_MS = 60 * 60 * 1000; // 1 hour

const store = new Map<string, ThreadEntry>();

function evictStale(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.lastAccess > TTL_MS) {
      store.delete(key);
    }
  }
}

export function threadKey(channel: string, threadTs: string): string {
  return `${channel}:${threadTs}`;
}

/**
 * Returns the Luzmo AIConversation id for a Slack thread, if any.
 */
export function getConversationId(key: string): string | undefined {
  evictStale();
  const entry = store.get(key);
  if (!entry) return undefined;
  entry.lastAccess = Date.now();
  return entry.conversationId;
}

/**
 * Persists the Luzmo conversation id for follow-ups in the same Slack thread.
 */
export function setConversationId(key: string, conversationId: string): void {
  store.set(key, {
    conversationId,
    lastAccess: Date.now(),
  });
}
