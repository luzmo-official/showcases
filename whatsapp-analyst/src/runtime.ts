import type { AppConfig } from './config.js';
import { Allowlist } from './identity/allowlist.js';
import { createMessageStore } from './storage/index.js';
import type { MessageStore } from './storage/types.js';
import { EmbedAuthService } from './luzmo/embed-auth.js';
import { WhatsAppClient } from './whatsapp/client.js';
import { Orchestrator } from './core/orchestrator.js';

export async function createBotRuntime(config: AppConfig): Promise<{
  store: MessageStore;
  allowlist: Allowlist;
  orchestrator: Orchestrator;
}> {
  const store = await createMessageStore(config);
  const allowlist = Allowlist.fromConfig(config);
  const embedAuth = new EmbedAuthService({
    apiKey: config.LUZMO_API_KEY,
    apiToken: config.LUZMO_API_TOKEN,
    host: config.LUZMO_HOST,
    datasetId: config.LUZMO_DATASET_ID,
    tenantColumnId: config.LUZMO_TENANT_COLUMN_ID,
  });
  const whatsapp = new WhatsAppClient({
    accessToken: config.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: config.WHATSAPP_PHONE_NUMBER_ID,
    graphVersion: config.WHATSAPP_GRAPH_VERSION,
  });
  const orchestrator = new Orchestrator(
    config,
    store,
    allowlist,
    embedAuth,
    whatsapp
  );
  return { store, allowlist, orchestrator };
}
