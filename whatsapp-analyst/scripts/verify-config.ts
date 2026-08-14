import { loadConfig } from '../src/config.js';
import { Allowlist } from '../src/identity/allowlist.js';
import { resolvePath } from '../src/config.js';

try {
  const config = loadConfig();
  const allowlist = Allowlist.fromConfig(config);
  console.log('Config OK');
  console.log('  dataset:', config.LUZMO_DATASET_ID);
  console.log('  phoneNumberId:', config.WHATSAPP_PHONE_NUMBER_ID);
  console.log('  storage:', config.STORAGE_BACKEND);
  if (config.ALLOWLIST_JSON) {
    console.log('  allowlist: (ALLOWLIST_JSON)');
  } else {
    console.log('  allowlist:', resolvePath(config.ALLOWLIST_PATH));
  }
  if (config.STORAGE_BACKEND === 'sqlite') {
    console.log('  sqlite:', resolvePath(config.SQLITE_PATH));
  } else {
    console.log('  dynamodb table:', config.DYNAMODB_TABLE_NAME);
  }
  void allowlist;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
