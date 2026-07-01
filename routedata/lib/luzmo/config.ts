/**
 * Luzmo embed configuration, sourced from environment variables.
 *
 * This app is deliberately backend-free: every Luzmo API call is made from the
 * browser with a long-lived embed key/token. Because the app is a static export
 * (`output: 'export'`, no server), these values are read from `NEXT_PUBLIC_*`
 * env vars and inlined into the client bundle at build time — so they still ship
 * to the browser, but they are no longer committed to source control.
 *
 * Only the derived *embed* key/token belong here. The Luzmo **API** key/token
 * must never appear in env vars that reach the client. Rotate the embed by
 * re-minting with the Node SDK on a trusted machine (see README) and updating
 * `.env.local`.
 *
 * @see https://developer.luzmo.com/guide/dashboard-embedding--generating-an-authorization-token.md
 */

/** Reads a required build-time env var, failing fast with a clear message when missing. */
function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and set the Luzmo embed credentials.`
    );
  }
  return value;
}

export const LUZMO_API_HOST =
  process.env.ROUTEDATA_LUZMO_API_HOST ?? 'https://api.luzmo.com';
export const LUZMO_APP_SERVER =
  process.env.ROUTEDATA_LUZMO_APP_SERVER ?? 'https://app.luzmo.com';

/** Default demo dataset the embed is authorized for. */
export const LUZMO_DATASET_ID = requireEnv(
  'ROUTEDATA_LUZMO_DATASET_ID',
  process.env.ROUTEDATA_LUZMO_DATASET_ID
);

/** Embed key (a.k.a. authorization id). Valid until `LUZMO_EMBED_EXPIRY`. */
export const LUZMO_EMBED_KEY = requireEnv(
  'ROUTEDATA_LUZMO_EMBED_KEY',
  process.env.ROUTEDATA_LUZMO_EMBED_KEY
);

/** Embed token. Valid until `LUZMO_EMBED_EXPIRY`. */
export const LUZMO_EMBED_TOKEN = requireEnv(
  'ROUTEDATA_LUZMO_EMBED_TOKEN',
  process.env.ROUTEDATA_LUZMO_EMBED_TOKEN
);

/** Informational — when the embed expires. Re-mint before this date. */
export const LUZMO_EMBED_EXPIRY =
  process.env.ROUTEDATA_LUZMO_EMBED_EXPIRY ?? '';
