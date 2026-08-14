---
title: "WhatsApp Analyst"
description: "Governed analytics Q&A over WhatsApp using Luzmo /AIPrompt (agent: analyst), with per-persona embed row filters and optional chart PNG replies."
tags:
  - Node.js
  - TypeScript
  - AI
author: "Luzmo"
image: "https://cdn.luzmo.com/showcases/whatsapp-example-ss.png"
url: "https://github.com/luzmo-official/showcases/tree/main/whatsapp-analyst"
---

# WhatsApp Analyst

![WhatsApp Analyst](https://cdn.luzmo.com/showcases/whatsapp-example-ss.png)

A WhatsApp bot that answers dataset questions via Luzmo’s hosted **`/AIPrompt`** API (`agent: analyst`), replies with WhatsApp-formatted text, and uploads chart PNGs when Luzmo returns a visualization.

Synthetic/demo data and a phone allowlist only — not production identity linking.

## Policy notes

WhatsApp Business Solution Terms restrict AI providers when AI is the **primary** functionality (Meta decides). Prefer demo recipients with **EEA or Brazil** country codes, or obtain written legal/Meta clearance for other regions (e.g. UK `+44`). Do not treat a non-EEA demo as policy-cleared without that clearance.

WhatsApp Business Solution Data must not train shared AI models. Confirm Luzmo’s [Trust Center](https://trust.luzmo.com/) posture before any customer-data use. Keep the bot dataset-specific; refuse clearly off-topic / general-purpose prompts.

## Prerequisites

- Node.js **22+** (uses built-in `node:sqlite`)
- Luzmo org with **IQ** addon and **Organization Owner** API key/token (required to mint embed authorizations)
- One demo dataset with a tenant column and distinct values for two personas
- Meta developer app + WhatsApp **test** number
- Public HTTPS tunnel (ngrok / Cloudflare Tunnel)
- Two WhatsApp phones as Meta test recipients

## Setup

```bash
npm install
cp .env.example .env
cp config/allowlist.example.json config/allowlist.json
# Edit .env and allowlist.json with real values / demo phones
```

`.env` and `config/allowlist.json` are gitignored — never commit secrets or real phone numbers.

### Environment

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port (default `3000`) |
| `PUBLIC_BASE_URL` | Tunnel HTTPS origin, no path (e.g. `https://abc.ngrok-free.dev`) |
| `WHATSAPP_ACCESS_TOKEN` | Prefer a System User token (not 24h temp) |
| `WHATSAPP_PHONE_NUMBER_ID` | Cloud API phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verify token you choose |
| `WHATSAPP_APP_SECRET` | Meta app secret (signature verification) |
| `WHATSAPP_GRAPH_VERSION` | e.g. `v25.0` |
| `LUZMO_API_KEY` / `LUZMO_API_TOKEN` | Owner credentials — **mint embeds only** |
| `LUZMO_HOST` | API host (default `https://api.luzmo.com`) |
| `LUZMO_DATASET_ID` | Shared dataset UUID |
| `LUZMO_TENANT_COLUMN_ID` | Column id used in embed filters |
| `LUZMO_THEME_ID` | Optional theme UUID or built-in id. Empty/unset = no theme |
| `LUZMO_TIMEZONE_ID` | IANA timezone for `/AIPrompt` (default `UTC`) |
| `ALLOWLIST_PATH` | Path to allowlist JSON (default `./config/allowlist.json`) |
| `ALLOWLIST_JSON` | Inline allowlist JSON (Lambda); overrides `ALLOWLIST_PATH` when set |
| `STORAGE_BACKEND` | `sqlite` (local default) or `dynamodb` (Lambda) |
| `SQLITE_PATH` | SQLite file for dedupe + conversations (default `./data/whatsapp-analyst.sqlite`) |
| `DYNAMODB_TABLE_NAME` | Required when `STORAGE_BACKEND=dynamodb` |
| `AWS_REGION` | Optional AWS region for the DynamoDB client |
| `CONVERSATION_IDLE_MINUTES` | Luzmo conversation idle TTL (default `60`) |
| `AIPROMPT_TIMEOUT_MS` | `/AIPrompt` timeout (default `120000`) |

`WHATSAPP_WABA_ID` is **not** required at runtime.

### Meta webhook

1. Tunnel: `ngrok http 3000` or `cloudflared tunnel --url http://localhost:3000`.
2. Set `PUBLIC_BASE_URL` to the tunnel HTTPS origin.
3. Callback URL: `https://<tunnel>/webhooks/whatsapp`.
4. Verify token = `WHATSAPP_VERIFY_TOKEN`.
5. Subscribe to `messages`.
6. Add demo phones as test recipients in Meta API Setup.

### Run

```bash
npm run verify-config
npm run dev
# or
npm run build && npm start
```

Health: `GET /healthz`

### Smoke scripts

```bash
npm run smoke:meta -- 32470000001
npm run smoke:luzmo -- "What is total revenue?"
npm run themes:list
```

## Demo script

1. Show shared dataset + tenant column.
2. Show allowlist personas and tenant values.
3. Phone A: `What is total revenue? Show me a chart.`
4. Phone B: same question → different numbers/chart.
5. Phone A follow-up: `Break that down by month.`
6. `/reset`, then a pronoun-only follow-up loses context.

## Architecture

```text
WhatsApp -> signed webhook -> persist/dedupe by wamid -> 200
  -> per-identity serial queue
  -> allowlist persona
  -> mint embed (dataset + tenant filter)
  -> /aiprompt SSE (buffer to completion)
  -> WhatsApp text (+ PNG via Media API using SAME embed token)
```

- Chart export uses the **same Embed** key/token as `/AIPrompt` (never owner credentials).
- Optional `LUZMO_THEME_ID` is applied only on PNG export.
- Luzmo conversation idle TTL: 60 minutes (separate from Meta’s 24h service window).
- Storage: Node `node:sqlite` locally (`STORAGE_BACKEND=sqlite`); DynamoDB on Lambda.

## AWS Lambda hosting

For a stable HTTPS webhook (Function URL + DynamoDB), see **[HOSTING.md](./HOSTING.md)**.

```bash
npm run build:lambda   # writes dist-lambda/index.js (exports.handler)
```

Not deployed via showcases `deploy.yml` — operate the Lambda in AWS separately.

## Tests

```bash
npm test
```

## Reference

See [createAIPrompt.md](https://developer.luzmo.com/api/createAIPrompt.md). Sibling pattern: the [Luzmo Analyst Slackbot](https://github.com/luzmo-official/showcases/tree/main/slackbot) in this repository.
