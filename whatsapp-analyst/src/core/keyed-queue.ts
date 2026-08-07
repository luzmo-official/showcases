type Task = () => Promise<void>;

/**
 * Serializes async work per key so rapid WhatsApp messages from the same
 * identity cannot race conversation_id updates.
 */
export class KeyedQueue {
  private readonly tails = new Map<string, Promise<void>>();

  enqueue(key: string, task: Task): Promise<void> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(task)
      .finally(() => {
        if (this.tails.get(key) === next) {
          this.tails.delete(key);
        }
      });
    this.tails.set(key, next);
    return next;
  }
}
