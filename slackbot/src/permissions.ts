import type { WebClient } from '@slack/web-api';
import type { AppConfig, UserCredentials } from './types.js';

/**
 * Caches Slack user ID -> email to avoid repeated API calls.
 * Emails don't change for a user, so this is safe to cache indefinitely.
 */
const emailCache = new Map<string, string>();

async function getSlackUserEmail(
  client: WebClient,
  userId: string
): Promise<string | null> {
  const cached = emailCache.get(userId);
  if (cached) return cached;

  try {
    const result = await client.users.info({ user: userId });
    const email = result.user?.profile?.email;
    if (email) {
      emailCache.set(userId, email);
      return email;
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch Slack user info for ${userId}:`, error);
    return null;
  }
}

/**
 * Resolves a Slack user ID to their Luzmo credentials.
 * Returns null if the user is not authorized (email not in users.json
 * or email not available from Slack).
 */
export async function resolveUserCredentials(
  client: WebClient,
  userId: string,
  config: AppConfig
): Promise<UserCredentials | null> {
  const email = await getSlackUserEmail(client, userId);
  if (!email) {
    console.warn(`Could not resolve email for Slack user ${userId}`);
    return null;
  }

  const entry = config.users[email];
  if (!entry) {
    console.warn(`Unauthorized email: ${email} (Slack user ${userId})`);
    return null;
  }

  return {
    email,
    luzmoKey: entry.luzmoKey,
    luzmoToken: entry.luzmoToken,
  };
}
