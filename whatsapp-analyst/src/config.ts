import { z } from 'zod';
import { config as loadDotenv } from 'dotenv';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

loadDotenv();

const emptyToUndefined = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  PUBLIC_BASE_URL: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : undefined))
    .pipe(z.string().url().optional()),
  WHATSAPP_ACCESS_TOKEN: z.string().min(1),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1),
  WHATSAPP_APP_SECRET: z.string().min(1),
  WHATSAPP_GRAPH_VERSION: z.string().default('v25.0'),
  LUZMO_API_KEY: z.string().min(1),
  LUZMO_API_TOKEN: z.string().min(1),
  LUZMO_HOST: z.string().url().default('https://api.luzmo.com'),
  LUZMO_DATASET_ID: z.string().uuid(),
  LUZMO_TENANT_COLUMN_ID: z.string().min(1),
  /**
   * Optional built-in theme id or account theme UUID.
   * When unset / empty, chart exports leave theme unset (showcase default).
   */
  LUZMO_THEME_ID: emptyToUndefined,
  /** IANA timezone for /AIPrompt (default UTC for showcase neutrality) */
  LUZMO_TIMEZONE_ID: z.string().min(1).default('UTC'),
  ALLOWLIST_PATH: z.string().default('./config/allowlist.json'),
  /** Inline allowlist JSON for Lambda (takes precedence over ALLOWLIST_PATH). */
  ALLOWLIST_JSON: emptyToUndefined,
  SQLITE_PATH: z.string().default('./data/whatsapp-analyst.sqlite'),
  STORAGE_BACKEND: z.enum(['sqlite', 'dynamodb']).default('sqlite'),
  DYNAMODB_TABLE_NAME: emptyToUndefined,
  AWS_REGION: emptyToUndefined,
  CONVERSATION_IDLE_MINUTES: z.coerce.number().int().positive().default(60),
  AIPROMPT_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
});

export type ChartTheme = { id: string };

export type AppConfig = z.infer<typeof envSchema> & {
  conversationIdleMs: number;
  /** Resolved export theme, or undefined for Luzmo defaults */
  chartTheme?: ChartTheme;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid configuration:\n${details}`);
  }
  const data = parsed.data;
  if (data.STORAGE_BACKEND === 'dynamodb' && !data.DYNAMODB_TABLE_NAME) {
    throw new Error(
      'Invalid configuration:\n  - DYNAMODB_TABLE_NAME: Required when STORAGE_BACKEND=dynamodb'
    );
  }
  return {
    ...data,
    LUZMO_HOST: data.LUZMO_HOST.replace(/\/$/, ''),
    conversationIdleMs: data.CONVERSATION_IDLE_MINUTES * 60 * 1000,
    chartTheme: data.LUZMO_THEME_ID
      ? { id: data.LUZMO_THEME_ID }
      : undefined,
  };
}

export function resolvePath(p: string): string {
  return resolve(process.cwd(), p);
}

export function readJsonFile<T>(path: string): T {
  const absolute = resolvePath(path);
  if (!existsSync(absolute)) {
    throw new Error(`Required file not found: ${absolute}`);
  }
  return JSON.parse(readFileSync(absolute, 'utf8')) as T;
}
