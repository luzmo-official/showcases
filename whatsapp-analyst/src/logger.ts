const SECRET_KEYS = [
  'token',
  'secret',
  'authorization',
  'password',
  'api_key',
  'apikey',
  'access_token',
  'app_secret',
  'signature',
];

function shouldRedact(key: string): boolean {
  const lower = key.toLowerCase();
  return SECRET_KEYS.some((s) => lower.includes(s));
}

function redactValue(key: string | undefined, value: unknown): unknown {
  if (key && shouldRedact(key)) {
    return '[REDACTED]';
  }
  if (Array.isArray(value)) {
    return value.map((v) => redactValue(undefined, v));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactValue(k, v);
    }
    return out;
  }
  return value;
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>): void {
    if (meta) {
      console.log(`[info] ${message}`, redactValue(undefined, meta));
    } else {
      console.log(`[info] ${message}`);
    }
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    if (meta) {
      console.warn(`[warn] ${message}`, redactValue(undefined, meta));
    } else {
      console.warn(`[warn] ${message}`);
    }
  },
  error(message: string, meta?: Record<string, unknown>): void {
    if (meta) {
      console.error(`[error] ${message}`, redactValue(undefined, meta));
    } else {
      console.error(`[error] ${message}`);
    }
  },
};
