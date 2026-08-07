import { loadConfig } from '../src/config.js';
import { Allowlist } from '../src/identity/allowlist.js';
import { resolvePath } from '../src/config.js';

try {
  const config = loadConfig();
  const allowlist = Allowlist.fromFile(config.ALLOWLIST_PATH);
  console.log('Config OK');
  console.log('  dataset:', config.LUZMO_DATASET_ID);
  console.log('  phoneNumberId:', config.WHATSAPP_PHONE_NUMBER_ID);
  console.log('  allowlist:', resolvePath(config.ALLOWLIST_PATH));
  console.log('  sqlite:', resolvePath(config.SQLITE_PATH));
  // Touch allowlist so unused import warning is avoided if tree-shaken — already used
  void allowlist;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
