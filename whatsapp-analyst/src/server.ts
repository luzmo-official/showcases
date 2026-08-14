import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { loadConfig } from './config.js';
import { createWhatsAppRouter } from './whatsapp/webhook.js';
import { logger } from './logger.js';
import { createBotRuntime } from './runtime.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const { store, orchestrator } = await createBotRuntime(config);

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
      awaitProcessing: false,
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

  await orchestrator.recoverPending();

  const server = app.listen(config.PORT, () => {
    logger.info('whatsapp-analyst listening', {
      port: config.PORT,
      publicBaseUrl: config.PUBLIC_BASE_URL,
      storage: config.STORAGE_BACKEND,
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
