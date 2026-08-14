import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import type { AppConfig } from '../config.js';
import type { MessageStore } from '../storage/types.js';
import type { Orchestrator } from '../core/orchestrator.js';
import {
  extractInboundTextMessages,
  handleWhatsAppPost,
  handleWhatsAppVerify,
} from './webhook-handlers.js';

export {
  extractInboundTextMessages,
  handleWhatsAppPost,
  handleWhatsAppVerify,
} from './webhook-handlers.js';

export function createWhatsAppRouter(deps: {
  config: AppConfig;
  store: MessageStore;
  orchestrator: Orchestrator;
  /** When true, await full processing before HTTP 200 (Lambda). */
  awaitProcessing?: boolean;
}): Router {
  const router = createRouter();

  router.get('/webhooks/whatsapp', (req: Request, res: Response) => {
    const result = handleWhatsAppVerify(deps.config, {
      mode: String(req.query['hub.mode'] ?? ''),
      token: String(req.query['hub.verify_token'] ?? ''),
      challenge: String(req.query['hub.challenge'] ?? ''),
    });
    if (result.ok) {
      res.status(200).send(result.challenge);
      return;
    }
    res.sendStatus(result.status);
  });

  router.post('/webhooks/whatsapp', async (req: Request, res: Response) => {
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      res.sendStatus(400);
      return;
    }

    const signature = req.header('x-hub-signature-256') ?? undefined;
    const result = await handleWhatsAppPost({
      config: deps.config,
      store: deps.store,
      orchestrator: deps.orchestrator,
      rawBody,
      signature,
      awaitProcessing: deps.awaitProcessing ?? false,
    });
    res.sendStatus(result.status);
  });

  return router;
}
