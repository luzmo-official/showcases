import Luzmo from '@luzmo/nodejs-sdk';

interface EmbedCacheEntry {
  authKey: string;
  authToken: string;
  expiresAt: number;
}

const cache = new Map<string, EmbedCacheEntry>();

/** Refresh embed tokens 5 minutes before expiry. */
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

const DEFAULT_TTL_MS = 23 * 60 * 60 * 1000;

/**
 * Mints (or returns cached) scoped embed credentials for /AIPrompt.
 * Uses org API credentials from users.json — never exposed to Slack.
 */
export async function resolveEmbedCredentials(
  orgKey: string,
  orgToken: string,
  luzmoHost: string,
  email: string,
  datasetIds: string[]
): Promise<{ luzmoKey: string; luzmoToken: string }> {
  const cacheKey = `${email}:${datasetIds.join(',')}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + EXPIRY_BUFFER_MS) {
    return { luzmoKey: cached.authKey, luzmoToken: cached.authToken };
  }

  const client = new Luzmo({
    api_key: orgKey,
    api_token: orgToken,
    host: luzmoHost,
  });

  const expiry = new Date(Date.now() + DEFAULT_TTL_MS).toISOString();
  const username = `slackbot.${email.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const instance = await client.create('authorization', {
    type: 'embed',
    username,
    name: email,
    email,
    role: 'viewer',
    access: {
      datasets: datasetIds.map((id) => ({ id, rights: 'use' as const })),
    },
    expiry,
  });

  if (!instance?.id || !instance?.token) {
    throw new Error('Luzmo embed authorization response missing id or token');
  }

  cache.set(cacheKey, {
    authKey: instance.id,
    authToken: instance.token,
    expiresAt: Date.now() + DEFAULT_TTL_MS,
  });

  return { luzmoKey: instance.id, luzmoToken: instance.token };
}
