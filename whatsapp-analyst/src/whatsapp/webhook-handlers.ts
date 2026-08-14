import type { AppConfig } from '../config.js';
import type { MessageStore } from '../storage/types.js';
import type { Orchestrator } from '../core/orchestrator.js';
import {
  extractWhatsAppIdentity,
  identityLookupCandidates,
  normalizeIdentityKey,
} from '../identity/allowlist.js';
import {
  timingSafeStringEqual,
  verifyWhatsAppSignature,
} from './signature.js';
import type {
  NormalizedInboundText,
  WhatsAppWebhookValue,
} from './types.js';
import { logger } from '../logger.js';

export function handleWhatsAppVerify(
  config: AppConfig,
  query: { mode: string; token: string; challenge: string }
): { ok: true; challenge: string } | { ok: false; status: number } {
  if (
    query.mode === 'subscribe' &&
    timingSafeStringEqual(query.token, config.WHATSAPP_VERIFY_TOKEN)
  ) {
    return { ok: true, challenge: query.challenge };
  }
  return { ok: false, status: 403 };
}

export async function handleWhatsAppPost(input: {
  config: AppConfig;
  store: MessageStore;
  orchestrator: Orchestrator;
  rawBody: Buffer;
  signature?: string;
  awaitProcessing: boolean;
}): Promise<{ status: number }> {
  if (
    !verifyWhatsAppSignature(
      input.rawBody,
      input.signature,
      input.config.WHATSAPP_APP_SECRET
    )
  ) {
    return { status: 401 };
  }

  let payload: {
    object?: string;
    entry?: Array<{ changes?: Array<{ value?: WhatsAppWebhookValue }> }>;
  };
  try {
    payload = JSON.parse(input.rawBody.toString('utf8')) as typeof payload;
  } catch {
    return { status: 400 };
  }

  const inbound = extractInboundTextMessages(payload);
  for (const message of inbound) {
    const candidates = identityLookupCandidates({
      from: message.from,
      fromUserId: message.fromUserId,
      contactUserId: message.contactUserId,
      contactWaId: message.contactWaId,
    });
    const identity =
      candidates[0] ??
      extractWhatsAppIdentity({
        from: message.from,
        fromUserId: message.fromUserId,
        contactUserId: message.contactUserId,
        contactWaId: message.contactWaId,
      }) ??
      message.from;

    const inserted = await input.store.tryInsertInbound({
      messageId: message.messageId,
      identityKey: normalizeIdentityKey(identity),
      messageText: message.text,
    });

    if (!inserted) {
      logger.info('Duplicate webhook ignored', {
        messageId: message.messageId,
      });
      continue;
    }

    if (input.awaitProcessing) {
      await input.orchestrator.handleInbound(message);
    } else {
      input.orchestrator.enqueueInbound(message);
    }
  }

  return { status: 200 };
}

export function extractInboundTextMessages(payload: {
  entry?: Array<{ changes?: Array<{ value?: WhatsAppWebhookValue }> }>;
}): NormalizedInboundText[] {
  const out: NormalizedInboundText[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value?.messages?.length) continue;
      const contact = value.contacts?.[0];
      for (const raw of value.messages) {
        if (raw.type !== 'text') continue;
        const textObj = raw.text as { body?: string } | undefined;
        const body = textObj?.body?.trim();
        if (!body) continue;
        const from = String(raw.from ?? '');
        if (!from) continue;
        out.push({
          messageId: String(raw.id ?? ''),
          from,
          fromUserId:
            typeof raw.from_user_id === 'string' ? raw.from_user_id : undefined,
          contactUserId: contact?.user_id,
          contactWaId: contact?.wa_id,
          text: body,
          timestamp: String(raw.timestamp ?? ''),
        });
      }
    }
  }
  return out.filter((m) => m.messageId);
}
