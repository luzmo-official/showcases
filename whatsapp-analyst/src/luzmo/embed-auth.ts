import Luzmo from '@luzmo/nodejs-sdk';
import type { Persona } from '../identity/allowlist.js';
import type { EmbedCredentials } from './types.js';
import { logger } from '../logger.js';

interface CacheEntry extends EmbedCredentials {
  expiresAt: number;
}

const EXPIRY_BUFFER_MS = 5 * 60 * 1000;
const DEFAULT_TTL_MS = 23 * 60 * 60 * 1000;

export interface EmbedAuthDeps {
  apiKey: string;
  apiToken: string;
  host: string;
  datasetId: string;
  tenantColumnId: string;
}

/**
 * Mints scoped embed authorizations with token-level tenant filters.
 * Owner API credentials are used ONLY for minting — never for /AIPrompt or export.
 */
export class EmbedAuthService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly deps: EmbedAuthDeps) {}

  async resolve(persona: Persona): Promise<EmbedCredentials> {
    const cacheKey = `${persona.username}:${persona.tenantValue}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + EXPIRY_BUFFER_MS) {
      return { luzmoKey: cached.luzmoKey, luzmoToken: cached.luzmoToken };
    }

    const client = new Luzmo({
      api_key: this.deps.apiKey,
      api_token: this.deps.apiToken,
      host: this.deps.host,
    });

    const expiry = new Date(Date.now() + DEFAULT_TTL_MS).toISOString();

    const instance = await client.create('authorization', {
      type: 'embed',
      username: persona.username,
      name: persona.name,
      email: persona.email,
      suborganization: persona.suborganization,
      role: 'viewer',
      expiry,
      access: {
        datasets: [{ id: this.deps.datasetId, rights: 'use' as const }],
      },
      filters: [
        {
          clause: 'where',
          origin: 'global',
          securable_id: this.deps.datasetId,
          column_id: this.deps.tenantColumnId,
          expression: '? in ?',
          value: [persona.tenantValue],
        },
      ],
    });

    if (!instance?.id || !instance?.token) {
      throw new Error('Luzmo embed authorization response missing id or token');
    }

    const credentials = {
      luzmoKey: String(instance.id),
      luzmoToken: String(instance.token),
    };

    this.cache.set(cacheKey, {
      ...credentials,
      expiresAt: Date.now() + DEFAULT_TTL_MS,
    });

    logger.info('Minted embed authorization', {
      username: persona.username,
      tenantValue: persona.tenantValue,
    });

    return credentials;
  }
}
