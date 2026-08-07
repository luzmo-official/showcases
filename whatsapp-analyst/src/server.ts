import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { loadConfig, resolvePath } from './config.js';
import { Allowlist } from './identity/allowlist.js';
import { Store } from './storage/sqlite.js';
import { EmbedAuthService } from './luzmo/embed-auth.js';
import { WhatsAppClient } from './whatsapp/client.js';
import { Orchestrator } from './core/orchestrator.js';
import { createWhatsAppRouter } from './whatsapp/webhook.js';
import { logger } from './logger.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const store = new Store(resolvePath(config.SQLITE_PATH));
  const allowlist = Allowlist.fromFile(config.ALLOWLIST_PATH);
  const embedAuth = new EmbedAuthService({
    apiKey: config.LUZMO_API_KEY,
    apiToken: config.LUZMO_API_TOKEN,
    host: config.LUZMO_HOST,
    datasetId: config.LUZMO_DATASET_ID,
    tenantColumnId: config.LUZMO_TENANT_COLUMN_ID,
  });
  const whatsapp = new WhatsAppClient({
    accessToken: config.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: config.WHATSAPP_PHONE_NUMBER_ID,
    graphVersion: config.WHATSAPP_GRAPH_VERSION,
  });
  const orchestrator = new Orchestrator(
    config,
    store,
    allowlist,
    embedAuth,
    whatsapp
  );

  const app = express();

  // Capture raw body for signature verification BEFORE json parsing.
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
      },
    })
  );

  app.get('/healthz', (_req: Request, res: Response) => {
    res.status(200).json({ ok: true });
  });

  app.use(
    createWhatsAppRouter({
      config,
      store,
      orchestrator,
    })
  );

  app.use(
    (
      err: unknown,
      _req: Request,
      res: Response,
      _next: NextFunction
    ) => {
      logger.error('Unhandled error', {
        error: err instanceof Error ? err.message : String(err),
      });
      res.sendStatus(500);
    }
  );

  orchestrator.recoverPending();

  const server = app.listen(config.PORT, () => {
    logger.info('luzmo-iq-whatsapp listening', {
      port: config.PORT,
      publicBaseUrl: config.PUBLIC_BASE_URL,
    });
  });

  const shutdown = () => {
    logger.info('Shutting down');
    server.close(() => {
      store.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
