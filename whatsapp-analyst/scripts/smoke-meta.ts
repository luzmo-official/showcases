/**
 * Smoke: send a plain text message via Cloud API.
 * Usage: npm run smoke:meta -- <E164_WITHOUT_PLUS>
 */
import { loadConfig } from '../src/config.js';
import { WhatsAppClient } from '../src/whatsapp/client.js';

const to = process.argv[2];
if (!to) {
  console.error('Usage: npm run smoke:meta -- <recipientDigits>');
  process.exit(1);
}

const config = loadConfig();
const client = new WhatsAppClient({
  accessToken: config.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: config.WHATSAPP_PHONE_NUMBER_ID,
  graphVersion: config.WHATSAPP_GRAPH_VERSION,
});

await client.sendText(to, 'pong');
console.log('Sent pong to', to);
