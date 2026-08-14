import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Context,
} from 'aws-lambda';
import { loadConfig } from '../config.js';
import { createBotRuntime } from '../runtime.js';
import {
  handleWhatsAppPost,
  handleWhatsAppVerify,
} from '../whatsapp/webhook-handlers.js';
import { logger } from '../logger.js';

/**
 * AWS Lambda Function URL / HTTP API handler (HubSpot-style).
 * Awaits full Luzmo/WhatsApp processing before returning 200.
 *
 * Bundled to CommonJS as exports.handler
 */
export async function handler(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const config = loadConfig();
  const { store, orchestrator } = await createBotRuntime(config);

  try {
    const method = event.requestContext?.http?.method ?? 'GET';
    const rawPath = event.rawPath ?? '/';

    if (method === 'GET' && rawPath.endsWith('/webhooks/whatsapp')) {
      const params = event.queryStringParameters ?? {};
      const result = handleWhatsAppVerify(config, {
        mode: params['hub.mode'] ?? '',
        token: params['hub.verify_token'] ?? '',
        challenge: params['hub.challenge'] ?? '',
      });
      if (result.ok) {
        return {
          statusCode: 200,
          headers: { 'content-type': 'text/plain' },
          body: result.challenge,
        };
      }
      return { statusCode: result.status, body: '' };
    }

    if (method === 'POST' && rawPath.endsWith('/webhooks/whatsapp')) {
      const rawBody = decodeBody(event);
      if (!rawBody) {
        return { statusCode: 400, body: 'Missing body' };
      }
      const signature =
        event.headers?.['x-hub-signature-256'] ??
        event.headers?.['X-Hub-Signature-256'];

      const result = await handleWhatsAppPost({
        config,
        store,
        orchestrator,
        rawBody,
        signature,
        awaitProcessing: true,
      });
      return { statusCode: result.status, body: '' };
    }

    if (method === 'GET' && (rawPath === '/' || rawPath.endsWith('/healthz'))) {
      return {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ok: true }),
      };
    }

    logger.warn('Unhandled Lambda path', { method, rawPath });
    return { statusCode: 404, body: 'Not found' };
  } finally {
    store.close();
  }
}

function decodeBody(event: APIGatewayProxyEventV2): Buffer | null {
  if (event.body == null) return null;
  if (event.isBase64Encoded) {
    return Buffer.from(event.body, 'base64');
  }
  return Buffer.from(event.body, 'utf8');
}
