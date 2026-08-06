# Luzmo Analyst Slackbot

A Slack bot that answers data questions via Luzmo's hosted **`/AIPrompt`** API (`agent: analyst`), streams progress updates into Slack, and uploads chart PNGs when IQ returns a visualization.

## Prerequisites

- Node.js 20+
- Luzmo account with **IQ addon** enabled (required for `agent: analyst`)
- Luzmo API key + token per authorized user (see `users.json`)
- A Slack App configured with Socket Mode (see [Slack App Setup](#slack-app-setup))

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

3. Copy `users.json.example` to `users.json` and add authorized users:

```bash
cp users.json.example users.json
```

4. Start the bot:

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build && npm start
```

## Slack App Setup

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app
2. Under **Socket Mode**, enable it and generate an App-Level Token with `connections:write` scope — this is your `SLACK_APP_TOKEN` (`xapp-...`)
3. Under **OAuth & Permissions**, add these Bot Token Scopes:
   - `app_mentions:read` — to respond when mentioned
   - `chat:write` — to send and update messages
   - `files:write` — to upload chart PNGs
   - `im:history` — to read DMs
   - `im:read` — to see DM channels
   - `users:read` — to look up user profiles
   - `users:read.email` — to read user emails for permission checks
4. Under **Event Subscriptions**, enable events and subscribe to:
   - `app_mention` — bot is mentioned in a channel
   - `message.im` — DM sent to the bot
5. Under **App Home**:
   - Open the **Messages Tab** section
   - Enable the Messages Tab
   - Tick **Allow users to send Slash commands and messages from the messages tab**
   - Save Changes
   - Reinstall the app if Slack prompts you

   This fixes the Slack message “Sending messages to this app has been turned off.” for DMs.
6. Install the app to your workspace — the Bot User OAuth Token is your `SLACK_BOT_TOKEN` (`xoxb-...`)

## Configuration

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SLACK_BOT_TOKEN` | Yes | Bot User OAuth Token (`xoxb-...`) |
| `SLACK_APP_TOKEN` | Yes | App-Level Token (`xapp-...`) |
| `DATASET_IDS` | Yes | Comma-separated dataset IDs pinned on each `/AIPrompt` call |
| `LUZMO_HOST` | No | Luzmo API host (defaults to `https://api.luzmo.com`) |
| `AIPROMPT_USE_EMBED_AUTH` | No | When `true` (default), mint scoped embed tokens per user for `/AIPrompt` |

### User Permissions (`users.json`)

Each authorized user is mapped by email to their Luzmo API credentials:

```json
{
  "alice@company.com": {
    "luzmoKey": "your-luzmo-api-key",
    "luzmoToken": "your-luzmo-api-token"
  }
}
```

Org credentials are used to mint embed tokens (when enabled) and to call the Luzmo Export API for chart PNGs. They are never sent to Slack clients.

Only users whose Slack email appears in this file can use the bot. Unauthorized users receive a permission denied message.

## Usage

- **Mention the bot** in any channel: `@Analyst Bot What are the top categories by revenue?`
- **DM the bot** directly: `What are the top categories by revenue?`

The bot will:

1. Verify the user's email against `users.json`
2. Post a "thinking" message in the thread
3. Call `POST /0.1.0/aiprompt` with `agent: analyst` and stream progress + text
4. Replace the message with the final answer
5. Upload a chart PNG when IQ returns an item asset

Follow-up messages in the same Slack thread continue the Luzmo `conversation_id` automatically.

## Architecture

```
Slack → message-handler → aiprompt-client → Luzmo /AIPrompt
                       → chart-renderer → Slack
```

See [createAIPrompt.md](https://developer.luzmo.com/api/createAIPrompt.md) for the API reference.
