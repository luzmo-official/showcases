/**
 * Smoke: mint embed + call /AIPrompt for persona-a.
 * Usage: npm run smoke:luzmo -- "What is total revenue?"
 */
import { loadConfig } from '../src/config.js';
import { Allowlist } from '../src/identity/allowlist.js';
import { EmbedAuthService } from '../src/luzmo/embed-auth.js';
import { collectAIPrompt } from '../src/luzmo/aiprompt-client.js';

const question = process.argv.slice(2).join(' ') || 'What is total revenue?';
const config = loadConfig();
const allowlist = Allowlist.fromFile(config.ALLOWLIST_PATH);

const resolved = allowlist.resolve('+32470000001');
if (!resolved) {
  throw new Error(
    'Add +32470000001 to config/allowlist.json (or change this script to your demo phone).'
  );
}

const embedAuth = new EmbedAuthService({
  apiKey: config.LUZMO_API_KEY,
  apiToken: config.LUZMO_API_TOKEN,
  host: config.LUZMO_HOST,
  datasetId: config.LUZMO_DATASET_ID,
  tenantColumnId: config.LUZMO_TENANT_COLUMN_ID,
});

const embed = await embedAuth.resolve(resolved.persona);
const result = await collectAIPrompt({
  question,
  luzmoKey: embed.luzmoKey,
  luzmoToken: embed.luzmoToken,
  luzmoHost: config.LUZMO_HOST,
  datasetId: config.LUZMO_DATASET_ID,
  timezoneId: config.LUZMO_TIMEZONE_ID,
});

// Local smoke only — prints the answer to the terminal (not used by the bot logger).
console.log('conversation_id:', result.conversationId);
console.log('text:', result.text);
console.log('has chart item:', Boolean(result.item));
if (result.error) console.error('error:', result.error);
