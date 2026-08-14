import type { AppConfig } from '../config.js';
import type { Allowlist } from '../identity/allowlist.js';
import {
  extractWhatsAppIdentity,
  identityLookupCandidates,
  normalizeIdentityKey,
} from '../identity/allowlist.js';
import type { EmbedAuthService } from '../luzmo/embed-auth.js';
import { collectAIPrompt } from '../luzmo/aiprompt-client.js';
import { renderChartToPng } from '../luzmo/chart-export.js';
import type { MessageStore } from '../storage/types.js';
import type { WhatsAppClient } from '../whatsapp/client.js';
import {
  markdownToWhatsApp,
  splitWhatsAppText,
} from '../whatsapp/formatting.js';
import type { NormalizedInboundText } from '../whatsapp/types.js';
import { KeyedQueue } from './keyed-queue.js';
import { logger } from '../logger.js';

const GENERIC_ERROR =
  "Sorry, I couldn't complete that request. Please try again, or send /reset to start a new conversation.";

const DENIED =
  "Sorry, you don't have access to this demo assistant. Ask the demo host to add your number to the allowlist.";

const OFF_TOPIC =
  'I can only answer questions about the configured analytics dataset. Please ask a data question about that dataset.';

function redactIdentity(value: string): string {
  if (value.startsWith('+') && value.length > 6) {
    return `${value.slice(0, 3)}…${value.slice(-2)}`;
  }
  if (value.length > 12) {
    return `${value.slice(0, 8)}…`;
  }
  return value;
}

/** Heuristic refusal for clearly off-dataset / general-purpose prompts. */
export function looksOffTopic(text: string): boolean {
  const t = text.toLowerCase().trim();
  if (t.startsWith('/')) return false;
  const patterns = [
    /^(hi|hello|hey)\b/,
    /\bwrite (me )?a (poem|story|essay)\b/,
    /\bwho (are|is) (you|luzmo)\b/,
    /\bignore (all|previous) instructions\b/,
    /\bact as\b.+\bchatgpt\b/,
  ];
  return patterns.some((p) => p.test(t));
}

export class Orchestrator {
  private readonly queue = new KeyedQueue();

  constructor(
    private readonly config: AppConfig,
    private readonly store: MessageStore,
    private readonly allowlist: Allowlist,
    private readonly embedAuth: EmbedAuthService,
    private readonly whatsapp: WhatsAppClient
  ) {}

  /**
   * Local Express path: serialize per identity without blocking the webhook 200.
   */
  enqueueInbound(message: NormalizedInboundText): void {
    const identityHint =
      extractWhatsAppIdentity({
        from: message.from,
        fromUserId: message.fromUserId,
        contactUserId: message.contactUserId,
        contactWaId: message.contactWaId,
      }) ?? message.from;
    const key = normalizeIdentityKey(identityHint);

    void this.queue.enqueue(key, async () => {
      try {
        await this.processMessage(message);
      } catch (error) {
        logger.error('Unhandled message processing error', {
          error: error instanceof Error ? error.message : String(error),
          messageId: message.messageId,
        });
        await this.store.markFailed(
          message.messageId,
          error instanceof Error ? error.name : 'unhandled'
        );
      }
    });
  }

  /**
   * Lambda path: await the full Luzmo/WhatsApp flow before returning HTTP 200.
   */
  async handleInbound(message: NormalizedInboundText): Promise<void> {
    try {
      await this.processMessage(message);
    } catch (error) {
      logger.error('Unhandled message processing error', {
        error: error instanceof Error ? error.message : String(error),
        messageId: message.messageId,
      });
      await this.store.markFailed(
        message.messageId,
        error instanceof Error ? error.name : 'unhandled'
      );
    }
  }

  async recoverPending(): Promise<void> {
    const rows = await this.store.listRecoverable(5 * 60 * 1000);
    for (const row of rows) {
      this.enqueueInbound({
        messageId: row.message_id,
        from: row.identity_key.replace(/^\+/, ''),
        text: row.message_text,
        timestamp: row.received_at,
      });
    }
    if (rows.length) {
      logger.info('Requeued recoverable messages', { count: rows.length });
    }
  }

  private async processMessage(message: NormalizedInboundText): Promise<void> {
    const identityInput = {
      from: message.from,
      fromUserId: message.fromUserId,
      contactUserId: message.contactUserId,
      contactWaId: message.contactWaId,
    };

    const candidates = identityLookupCandidates(identityInput);
    if (candidates.length === 0) {
      await this.store.markFailed(message.messageId, 'missing_identity');
      return;
    }

    const resolved =
      candidates
        .map((c) => this.allowlist.resolve(c))
        .find((r) => r != null) ?? null;

    const replyTo = message.from.startsWith('+')
      ? message.from.slice(1)
      : message.from.replace(/\D/g, '');

    try {
      await this.whatsapp.markReadAndTyping(message.messageId);
    } catch (error) {
      logger.warn('Failed to mark read/typing', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (!resolved) {
      logger.info('Allowlist miss', {
        candidates: candidates.map(redactIdentity),
      });
      try {
        await this.whatsapp.sendText(replyTo, DENIED);
      } catch {
        /* ignore */
      }
      await this.store.markFailed(message.messageId, 'unauthorized');
      return;
    }

    await this.store.markProcessing(message.messageId);
    const text = message.text.trim();

    if (text.toLowerCase() === '/reset') {
      await this.store.clearConversation(resolved.identityKey);
      try {
        await this.whatsapp.sendText(replyTo, 'Conversation reset.');
      } catch (error) {
        logger.error('Failed to send reset confirmation', {
          error: error instanceof Error ? error.message : String(error),
        });
        await this.store.markFailed(message.messageId, 'whatsapp_send_failed');
        return;
      }
      await this.store.markCompleted(message.messageId);
      return;
    }

    if (looksOffTopic(text)) {
      try {
        await this.whatsapp.sendText(replyTo, OFF_TOPIC);
      } catch (error) {
        logger.error('Failed to send off-topic reply', {
          error: error instanceof Error ? error.message : String(error),
        });
        await this.store.markFailed(message.messageId, 'whatsapp_send_failed');
        return;
      }
      await this.store.markCompleted(message.messageId);
      return;
    }

    try {
      const embed = await this.embedAuth.resolve(resolved.persona);
      const conversationId = await this.store.getActiveConversationId(
        resolved.identityKey,
        this.config.conversationIdleMs
      );

      const result = await collectAIPrompt({
        question: text,
        luzmoKey: embed.luzmoKey,
        luzmoToken: embed.luzmoToken,
        luzmoHost: this.config.LUZMO_HOST,
        datasetId: this.config.LUZMO_DATASET_ID,
        conversationId,
        timezoneId: this.config.LUZMO_TIMEZONE_ID,
        timeoutMs: this.config.AIPROMPT_TIMEOUT_MS,
      });

      if (result.conversationId) {
        await this.store.setConversation(
          resolved.identityKey,
          result.conversationId
        );
      } else if (conversationId) {
        await this.store.touchConversation(resolved.identityKey);
      }

      if (result.error && !result.text) {
        await this.whatsapp.sendText(replyTo, GENERIC_ERROR);
        await this.store.markFailed(message.messageId, 'aiprompt_error');
        return;
      }

      const waText = markdownToWhatsApp(
        result.text || 'I could not find an answer for that question.'
      );
      for (const chunk of splitWhatsAppText(waText)) {
        await this.whatsapp.sendText(replyTo, chunk);
      }

      if (result.item) {
        try {
          const png = await renderChartToPng(result.item, {
            luzmoKey: embed.luzmoKey,
            luzmoToken: embed.luzmoToken,
            luzmoHost: this.config.LUZMO_HOST,
            theme: this.config.chartTheme,
          });
          if (png) {
            const mediaId = await this.whatsapp.uploadImage(png);
            await this.whatsapp.sendImage(replyTo, mediaId);
          }
        } catch (error) {
          // Text already delivered — don't confuse the user with GENERIC_ERROR.
          logger.warn('Chart export/send failed', {
            error: error instanceof Error ? error.message : String(error),
            messageId: message.messageId,
          });
        }
      }

      await this.store.markCompleted(message.messageId);
    } catch (error) {
      logger.error('Failed processing inbound message', {
        error: error instanceof Error ? error.message : String(error),
        messageId: message.messageId,
      });
      try {
        await this.whatsapp.sendText(replyTo, GENERIC_ERROR);
      } catch {
        /* ignore */
      }
      await this.store.markFailed(
        message.messageId,
        error instanceof Error ? error.name : 'unknown'
      );
    }
  }
}
