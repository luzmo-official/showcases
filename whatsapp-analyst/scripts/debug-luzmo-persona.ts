import { loadConfig } from '../src/config.js';
import { Allowlist } from '../src/identity/allowlist.js';
import { EmbedAuthService } from '../src/luzmo/embed-auth.js';
import { collectAIPrompt } from '../src/luzmo/aiprompt-client.js';

/**
 * Local debug helper: mint an embed for an allowlisted identity and ask IQ.
 * Usage: npx tsx scripts/debug-luzmo-persona.ts +32470000001
 */
const phone = process.argv[2];
if (!phone) {
  console.error('Usage: npx tsx scripts/debug-luzmo-persona.ts <+E164 phone>');
  process.exit(1);
}

const config = loadConfig();
const allowlist = Allowlist.fromFile(config.ALLOWLIST_PATH);
const resolved = allowlist.resolve(phone);
if (!resolved) {
  throw new Error(`phone not on allowlist: ${phone}`);
}
console.log(
  'persona',
  resolved.persona.username,
  resolved.persona.tenantValue
);
console.log('dataset', config.LUZMO_DATASET_ID);
console.log('tenantColumn', config.LUZMO_TENANT_COLUMN_ID);

const embedAuth = new EmbedAuthService({
  apiKey: config.LUZMO_API_KEY,
  apiToken: config.LUZMO_API_TOKEN,
  host: config.LUZMO_HOST,
  datasetId: config.LUZMO_DATASET_ID,
  tenantColumnId: config.LUZMO_TENANT_COLUMN_ID,
});

try {
  const embed = await embedAuth.resolve(resolved.persona);
  console.log('embed minted ok');
  const result = await collectAIPrompt({
    question: process.argv[3] ?? 'How were my metrics last quarter?',
    luzmoKey: embed.luzmoKey,
    luzmoToken: embed.luzmoToken,
    luzmoHost: config.LUZMO_HOST,
    datasetId: config.LUZMO_DATASET_ID,
    timezoneId: config.LUZMO_TIMEZONE_ID,
    timeoutMs: 120_000,
  });
  console.log('text length', result.text?.length ?? 0);
  console.log('text preview', (result.text || '').slice(0, 300));
  console.log('stream error', result.error);
  console.log('has item', Boolean(result.item));
  console.log('conversation', result.conversationId);
} catch (e) {
  console.error('FAIL', e instanceof Error ? e.stack ?? e.message : e);
  process.exit(1);
}
