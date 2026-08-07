import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import type { AppConfig } from '../config.js';
import type { Store } from '../storage/sqlite.js';
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

export function createWhatsAppRouter(deps: {
  config: AppConfig;
  store: Store;
  orchestrator: Orchestrator;
}): Router {
  const router = createRouter();

  router.get('/webhooks/whatsapp', (req: Request, res: Response) => {
    const mode = String(req.query['hub.mode'] ?? '');
    const token = String(req.query['hub.verify_token'] ?? '');
    const challenge = String(req.query['hub.challenge'] ?? '');

    if (
      mode === 'subscribe' &&
      timingSafeStringEqual(token, deps.config.WHATSAPP_VERIFY_TOKEN)
    ) {
      res.status(200).send(challenge);
      return;
    }
    res.sendStatus(403);
  });

  router.post('/webhooks/whatsapp', (req: Request, res: Response) => {
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      res.sendStatus(400);
      return;
    }

    const signature = req.header('x-hub-signature-256') ?? undefined;
    if (
      !verifyWhatsAppSignature(
        rawBody,
        signature,
        deps.config.WHATSAPP_APP_SECRET
      )
    ) {
      res.sendStatus(401);
      return;
    }

    let payload: {
      object?: string;
      entry?: Array<{ changes?: Array<{ value?: WhatsAppWebhookValue }> }>;
    };
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as typeof payload;
    } catch {
      res.sendStatus(400);
      return;
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

      const inserted = deps.store.tryInsertInbound({
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

      deps.orchestrator.enqueueInbound(message);
    }

    res.sendStatus(200);
  });

  return router;
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
