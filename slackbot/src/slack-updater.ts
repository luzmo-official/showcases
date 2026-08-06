import type { WebClient } from '@slack/web-api';
import type { ProgressTreeNode, ProgressStatus } from './types.js';
import { markdownToSlackMrkdwn } from './markdown-to-mrkdwn.js';

const UPDATE_INTERVAL_MS = 1200;

const STATUS_ICONS: Record<ProgressStatus, string> = {
  pending: '\u2022',     // bullet
  inProgress: '\u25B6',  // play arrow
  success: '\u2713',     // checkmark
  error: '\u2717',       // cross
};

function formatMetadataValue(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) {
    const parts = value.map(formatMetadataValue).filter((v): v is string => v != null && v !== '');
    return parts.length > 0 ? parts.join(', ') : null;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object') {
    // Prefer localized/string values if present; otherwise a compact JSON fallback.
    const values = Object.values(value as Record<string, unknown>);
    const strings = values
      .map(formatMetadataValue)
      .filter((v): v is string => v != null && v !== '');
    if (strings.length > 0) return strings.join(', ');
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Resolves `{{placeholder}}` tokens from AIPrompt `description_metadata`.
 * Missing keys are dropped so Slack never shows raw `{{key}}`.
 */
function interpolateProgressDescription(
  description: string,
  metadata?: Record<string, unknown>
): string {
  return description
    .replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
      const formatted = formatMetadataValue(metadata?.[key]);
      return formatted ?? '';
    })
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
}

/**
 * Formats the progress tree into Slack mrkdwn text.
 * Shows only nodes that have a description (leaf steps with meaningful info).
 */
function formatProgressTree(node: ProgressTreeNode, depth = 0): string {
  const lines: string[] = [];

  if (node.description && depth > 0) {
    const label = interpolateProgressDescription(
      node.description,
      node.descriptionMetadata
    );
    // Drop lines that are empty or still contain unresolved placeholders.
    if (label && !/\{\{[^}]+\}\}/.test(label)) {
      const indent = '    '.repeat(depth - 1);
      const icon = STATUS_ICONS[node.status];
      lines.push(`${indent}${icon} ${label}`);
    }
  }

  if (node.children) {
    for (const child of node.children) {
      lines.push(...formatProgressTree(child, depth + 1).split('\n').filter(Boolean));
    }
  }

  return lines.join('\n');
}

/**
 * Manages a single Slack message, updating it with progress and streaming text.
 * Throttles updates to stay within Slack's rate limits (~1 update/sec).
 */
export class SlackUpdater {
  private readonly client: WebClient;
  private readonly channel: string;
  private messageTs: string;

  private progressText = '';
  private bodyText = '';
  private _suffix: string | null = null;
  private dirty = false;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private lastFlushTime = 0;
  private _finished = false;

  get isFinished(): boolean {
    return this._finished;
  }

  constructor(client: WebClient, channel: string, messageTs: string) {
    this.client = client;
    this.channel = channel;
    this.messageTs = messageTs;
  }

  updateProgress(tree: ProgressTreeNode): void {
    const formatted = formatProgressTree(tree);
    if (formatted && formatted !== this.progressText) {
      this.progressText = formatted;
      this.scheduleFlush();
    }
  }

  appendText(token: string): void {
    this.bodyText += token;
    this.scheduleFlush();
  }

  /**
   * Immediately flush the final state of the message.
   * Clears progress steps so only the text body is shown.
   */
  async finish(finalText?: string): Promise<void> {
    this._finished = true;

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    this.progressText = '';

    if (finalText !== undefined) {
      this.bodyText = finalText;
    }

    await this.flush();
  }

  /**
   * Update the message with a suffix appended after the body text.
   * Useful for showing transient status like "Generating chart..."
   */
  async setSuffix(suffix: string | null): Promise<void> {
    this._suffix = suffix;
    this.dirty = true;
    await this.flush();
  }

  async setError(message: string): Promise<void> {
    this._finished = true;

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    this.bodyText = `_Error: ${message}_`;
    this.progressText = '';
    await this.flush();
  }

  private scheduleFlush(): void {
    if (this._finished) return;
    this.dirty = true;

    if (this.flushTimer) return;

    const elapsed = Date.now() - this.lastFlushTime;
    const delay = Math.max(0, UPDATE_INTERVAL_MS - elapsed);

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush().catch((err) =>
        console.error('Failed to flush Slack message update:', err)
      );
    }, delay);
  }

  private async flush(): Promise<void> {
    if (!this.dirty && !this._finished) return;
    this.dirty = false;
    this.lastFlushTime = Date.now();

    const parts: string[] = [];

    if (this.progressText) {
      parts.push(this.progressText);
    }

    if (this.bodyText) {
      if (this.progressText) parts.push('');
      // Convert Markdown bold for Slack display only (not AIPrompt payloads).
      parts.push(markdownToSlackMrkdwn(this.bodyText));
    }

    if (this._suffix) {
      parts.push('');
      parts.push(this._suffix);
    }

    const text = parts.join('\n') || '_Processing..._';

    try {
      await this.client.chat.update({
        channel: this.channel,
        ts: this.messageTs,
        text,
      });
    } catch (error) {
      console.error('Failed to update Slack message:', error);
    }
  }
}
