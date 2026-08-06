import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { AppConfig, UsersConfig } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function loadUsersConfig(): UsersConfig {
  const filePath = resolve(PROJECT_ROOT, 'users.json');
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);

    for (const [email, entry] of Object.entries(parsed)) {
      const e = entry as Record<string, unknown>;
      if (!e.luzmoKey || !e.luzmoToken) {
        throw new Error(
          `Invalid entry for ${email}: missing luzmoKey or luzmoToken`
        );
      }
    }

    return parsed as UsersConfig;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `users.json not found at ${filePath}. Copy users.json.example and add your users.`
      );
    }
    throw error;
  }
}

function parseUseEmbedAuth(): boolean {
  const raw = process.env.AIPROMPT_USE_EMBED_AUTH;
  if (raw === undefined || raw === '') return true;
  return raw !== '0' && raw.toLowerCase() !== 'false';
}

export function loadConfig(): AppConfig {
  const datasetIdsRaw = requireEnv('DATASET_IDS');
  const datasetIds = datasetIdsRaw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (datasetIds.length === 0) {
    throw new Error('DATASET_IDS must contain at least one dataset ID');
  }

  const users = loadUsersConfig();
  const userCount = Object.keys(users).length;
  if (userCount === 0) {
    throw new Error('users.json must contain at least one user entry');
  }

  return {
    slackBotToken: requireEnv('SLACK_BOT_TOKEN'),
    slackAppToken: requireEnv('SLACK_APP_TOKEN'),
    datasetIds,
    luzmoHost: process.env.LUZMO_HOST || 'https://api.luzmo.com',
    users,
    useEmbedAuth: parseUseEmbedAuth(),
  };
}
