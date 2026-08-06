import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import type { AppConfig, ItemConfig } from './types.js';
import { resolveUserCredentials } from './permissions.js';
import { resolveEmbedCredentials } from './embed-auth.js';
import {
  streamAIPrompt,
  isProgressMessage,
  isTextDeltaMessage,
  isFinishMessage,
  isErrorMessage,
  isStartMessage,
  extractTextFromResult,
  extractItemFromResult,
} from './aiprompt-client.js';
import { SlackUpdater } from './slack-updater.js';
import { renderChartToPng } from './chart-renderer.js';
import { threadKey, getConversationId, setConversationId } from './thread-history.js';

/**
 * Strips the bot mention (`<@BOTID>`) from the message text.
 * For DMs, the text is returned as-is.
 */
function extractQuestion(text: string, botUserId?: string): string {
  if (botUserId) {
    return text.replace(new RegExp(`<@${botUserId}>\\s*`, 'g'), '').trim();
  }
  return text.trim();
}

async function resolveAIPromptCredentials(
  config: AppConfig,
  credentials: { email: string; luzmoKey: string; luzmoToken: string }
): Promise<{ luzmoKey: string; luzmoToken: string }> {
  if (!config.useEmbedAuth) {
    return {
      luzmoKey: credentials.luzmoKey,
      luzmoToken: credentials.luzmoToken,
    };
  }

  return resolveEmbedCredentials(
    credentials.luzmoKey,
    credentials.luzmoToken,
    config.luzmoHost,
    credentials.email,
    config.datasetIds
  );
}

/**
 * Core handler shared by app_mention and DM message events.
 */
export function createMessageHandler(config: AppConfig, botUserId: string) {
  return async ({
    event,
    client,
    say,
  }: SlackEventMiddlewareArgs<'app_mention' | 'message'> &
    AllMiddlewareArgs) => {
    if ('bot_id' in event || ('subtype' in event && event.subtype)) return;

    const userId = 'user' in event ? event.user : undefined;
    const text = 'text' in event ? event.text : undefined;
    const channel = event.channel;
    const eventTs = 'ts' in event ? (event as { ts: string }).ts : undefined;
    const parentThreadTs =
      'thread_ts' in event
        ? (event as { thread_ts?: string }).thread_ts
        : undefined;

    if (!userId || !text) return;

    const question = extractQuestion(text, botUserId);
    if (!question) {
      await say('Please include a question after mentioning me.');
      return;
    }

    const credentials = await resolveUserCredentials(client, userId, config);
    if (!credentials) {
      await say(
        `Sorry <@${userId}>, you don't have permission to use this bot. ` +
          'Contact an administrator to get access.'
      );
      return;
    }

    const replyThreadTs = parentThreadTs ?? eventTs!;
    const tKey = threadKey(channel, replyThreadTs);
    const conversationId = getConversationId(tKey);

    const initialMsg = await client.chat.postMessage({
      channel,
      thread_ts: replyThreadTs,
      text: '_Analyzing your question..._',
    });

    if (!initialMsg.ts) {
      console.error('Failed to post initial message — no timestamp returned');
      return;
    }

    const updater = new SlackUpdater(client, channel, initialMsg.ts);

    try {
      const promptCreds = await resolveAIPromptCredentials(config, credentials);

      let fullText = '';
      let chartItem: ItemConfig | undefined;
      let finishText = '';

      const stream = streamAIPrompt({
        question,
        luzmoKey: promptCreds.luzmoKey,
        luzmoToken: promptCreds.luzmoToken,
        luzmoHost: config.luzmoHost,
        datasetIds: config.datasetIds,
        conversationId,
      });

      for await (const message of stream) {
        if (isStartMessage(message)) {
          setConversationId(tKey, message.conversationId);
        } else if (isProgressMessage(message)) {
          if (message.conversationId) {
            setConversationId(tKey, message.conversationId);
          }
          updater.updateProgress(message.progress);
        } else if (isTextDeltaMessage(message)) {
          fullText += message.textDelta;
          updater.appendText(message.textDelta);
        } else if (isFinishMessage(message)) {
          const convId =
            message.conversationId ??
            message.result?.conversation_id;
          if (convId) {
            setConversationId(tKey, convId);
          }

          finishText = extractTextFromResult(message.result);
          chartItem = extractItemFromResult(message.result);

          const finalText =
            finishText || fullText || (chartItem ? '' : 'No response generated.');
          await updater.finish(finalText);
        } else if (isErrorMessage(message)) {
          await updater.setError(message.error);
        }
      }

      if (fullText && !updater.isFinished) {
        await updater.finish(fullText);
      }

      const hasTextResponse = !!(fullText || finishText);
      if (chartItem) {
        try {
          await updater.setSuffix('_Generating chart..._');

          const png = await renderChartToPng(chartItem, {
            luzmoKey: credentials.luzmoKey,
            luzmoToken: credentials.luzmoToken,
            luzmoHost: config.luzmoHost,
          });

          await updater.setSuffix(null);

          if (png) {
            await client.files.uploadV2({
              channel_id: channel,
              thread_ts: replyThreadTs,
              file: png,
              filename: 'chart.png',
              title: 'Chart',
            });

            if (!hasTextResponse) {
              await client.chat.delete({ channel, ts: initialMsg.ts! }).catch(() => {});
            }
          } else {
            console.warn('Chart rendering returned no image');
          }
        } catch (chartError) {
          console.error('Failed to render/upload chart:', chartError);
          await updater.setSuffix(null);
        }
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('AIPrompt stream error:', error);
      await updater.setError(errorMsg);
    }
  };
}
