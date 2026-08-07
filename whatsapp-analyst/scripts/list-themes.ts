import { config as loadDotenv } from 'dotenv';
import Luzmo from '@luzmo/nodejs-sdk';

loadDotenv();

async function main() {
  const client = new Luzmo({
    api_key: process.env.LUZMO_API_KEY!,
    api_token: process.env.LUZMO_API_TOKEN!,
    host: (process.env.LUZMO_HOST || 'https://api.luzmo.com').replace(/\/$/, ''),
  });

  const res = (await client.get('theme', {})) as {
    count?: number;
    rows?: Array<{ id: string; name?: string | Record<string, string> }>;
  };

  console.log('count:', res?.count ?? 0);
  const rows = res?.rows ?? [];
  for (const t of rows) {
    const name =
      typeof t.name === 'string'
        ? t.name
        : (t.name?.en ?? JSON.stringify(t.name));
    console.log(`${t.id}\t${name}`);
  }
  if (!rows.length) {
    console.log('No saved themes on this account.');
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
