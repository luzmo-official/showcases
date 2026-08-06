import 'dotenv/config';
import { App } from '@slack/bolt';
import { loadConfig } from './config.js';
import { createMessageHandler } from './message-handler.js';

async function main() {
  const config = loadConfig();

  const app = new App({
    token: config.slackBotToken,
    appToken: config.slackAppToken,
    socketMode: true,
  });

  // Resolve the bot's own user ID so we can strip mentions from messages
  const authResult = await app.client.auth.test({ token: config.slackBotToken });
  const botUserId = authResult.user_id || '';

  const handler = createMessageHandler(config, botUserId);

  // Respond when mentioned in a channel
  app.event('app_mention', handler);

  // Respond to direct messages
  app.event('message', async (args) => {
    if (args.event.channel_type === 'im') {
      await handler(args);
    }
  });

  await app.start();
  console.log(
    `Analyst Slackbot is running (bot user: ${botUserId}, ` +
      `${Object.keys(config.users).length} authorized users, ` +
      `${config.datasetIds.length} datasets)`
  );
}

main().catch((error) => {
  console.error('Fatal error starting Slackbot:', error);
  process.exit(1);
});
