# Hosting WhatsApp Analyst on AWS Lambda

Step-by-step guide to run this showcase behind a **stable HTTPS Lambda Function URL**, with **DynamoDB** for wamid dedupe and Luzmo conversation continuity.

This is **not** part of showcases [`deploy.yml`](https://github.com/luzmo-official/showcases/blob/main/.github/workflows/deploy.yml) (that pipeline only publishes static example frontends). Deploy and operate this Lambda in your AWS account separately.

Local development stays **Express + SQLite** (`npm run dev`).

## Architecture

```text
Meta WhatsApp Cloud API
  → Lambda Function URL (GET verify / POST webhook)
  → HMAC verify on raw body
  → DynamoDB (dedupe wamid + conversation_id)
  → Luzmo /AIPrompt + optional chart PNG
  → WhatsApp send APIs
  → HTTP 200 (only after work completes)
```

Cold starts of a few seconds after idle are expected and acceptable for demo traffic.

## Prerequisites

- AWS account access (or paired bootstrap) to create:
  - Lambda (Node.js **22.x**)
  - Function URL (auth type `NONE` — Meta auth is HMAC + verify token)
  - DynamoDB table
  - IAM execution role
  - Ability to set function environment variables (or Secrets Manager / SSM)
- Meta WhatsApp Cloud API app + test numbers
- Luzmo org with IQ addon + Organization Owner API key/token

## 1. Request AWS access

Ask your platform/AWS owner for SSO or IAM permissions to create and update the resources above in the demo/showcase account. Longer term, the showcase maintainer should be able to redeploy and rotate secrets without a full engineering project.

## 2. Create the DynamoDB table

Single-table design: partition key only.

| Setting | Value |
|---|---|
| Table name | e.g. `whatsapp-analyst` |
| Partition key | `pk` (String) |
| Sort key | none |
| Capacity | On-demand (recommended) |

Item shapes (written by the app):

- Inbound: `pk = inbound#<wamid>`, `entity = inbound`, status fields
- Conversation: `pk = conversation#<identityKey>`, `entity = conversation`, `luzmo_conversation_id`, `last_activity_at`

No GSIs required. `listRecoverable` is a no-op on DynamoDB (returns `[]`).

## 3. Create the IAM role

Trust policy: Lambda service principal.

Attach a policy that allows at least:

- `dynamodb:GetItem`, `PutItem`, `UpdateItem`, `DeleteItem` on the table ARN
- CloudWatch Logs create/write for the function

Outbound HTTPS to Meta Graph and Luzmo API uses the Lambda default network path (no VPC required for the first cut).

## 4. Build the Lambda bundle

From this package directory:

```bash
npm install
npm run build:lambda
```

Output: `dist-lambda/index.js` (CommonJS, **`exports.handler`**).

Zip for upload (include `package.json` so Node treats the bundle as CommonJS):

```bash
# macOS / Linux
cd dist-lambda && zip ../whatsapp-analyst-lambda.zip index.js index.js.map package.json && cd ..

# Windows PowerShell
Compress-Archive -Path dist-lambda\* -DestinationPath whatsapp-analyst-lambda.zip -Force
```

## 5. Create the Lambda function

| Setting | Value |
|---|---|
| Runtime | Node.js 22.x |
| Architecture | x86_64 (or arm64) |
| Handler | `index.handler` |
| Timeout | **120 seconds** (AIPrompt + chart export can be slow) |
| Memory | start at **1024 MB** (tune later) |
| Ephemeral storage | default is fine |
| Role | the role from step 3 |

Upload `whatsapp-analyst-lambda.zip`.

## 6. Configure environment variables

Set on the function (never commit secrets to git):

| Variable | Notes |
|---|---|
| `STORAGE_BACKEND` | `dynamodb` |
| `DYNAMODB_TABLE_NAME` | table from step 2 |
| `AWS_REGION` | e.g. `eu-west-1` (optional if same as function region) |
| `WHATSAPP_ACCESS_TOKEN` | System User token preferred |
| `WHATSAPP_PHONE_NUMBER_ID` | Cloud API phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | You choose; must match Meta webhook config |
| `WHATSAPP_APP_SECRET` | Meta app secret (HMAC) |
| `WHATSAPP_GRAPH_VERSION` | e.g. `v25.0` |
| `LUZMO_API_KEY` / `LUZMO_API_TOKEN` | Owner credentials — mint embeds only |
| `LUZMO_HOST` | default `https://api.luzmo.com` |
| `LUZMO_DATASET_ID` | dataset UUID |
| `LUZMO_TENANT_COLUMN_ID` | tenant column id |
| `LUZMO_THEME_ID` | optional |
| `LUZMO_TIMEZONE_ID` | default `UTC` |
| `ALLOWLIST_JSON` | full allowlist JSON string (recommended for Lambda) |
| `CONVERSATION_IDLE_MINUTES` | default `60` |
| `AIPROMPT_TIMEOUT_MS` | default `120000` |

`ALLOWLIST_JSON` takes precedence over `ALLOWLIST_PATH`. Do not rely on shipping `config/allowlist.json` inside the zip for production demos.

`PUBLIC_BASE_URL` is optional on Lambda; Meta uses the Function URL directly.

## 7. Create the Function URL

1. Lambda → Configuration → Function URL → Create.
2. Auth type: **NONE**.
3. Invoke mode: **BUFFERED**.
4. Copy the Function URL (HTTPS).

Optional: restrict by resource policy later; Meta signature verification remains mandatory.

## 8. Point Meta at the Function URL

1. Meta Developer → your app → WhatsApp → Configuration → Webhook.
2. Callback URL: `https://<function-url-host>/webhooks/whatsapp`  
   (If the Function URL already ends with `/`, do not double the slash; path must end with `/webhooks/whatsapp`.)
3. Verify token: same as `WHATSAPP_VERIFY_TOKEN`.
4. Subscribe to **messages**.
5. Ensure demo phones are test recipients.

GET verify is handled by the Lambda; POST awaits full processing before 200.

## 9. Smoke-test

1. Browser or curl health:

```bash
curl -sS "https://<function-url-host>/healthz"
```

2. In Meta, click **Verify and save** (or re-verify) the webhook.
3. Send a WhatsApp message from an allowlisted test phone.
4. Check CloudWatch Logs for the function; confirm DynamoDB items appear for inbound + conversation.

## 10. Redeploy

```bash
npm run build:lambda
# zip dist-lambda again, then:
aws lambda update-function-code \
  --function-name whatsapp-analyst \
  --zip-file fileb://whatsapp-analyst-lambda.zip
```

Update env vars in the console (or CLI) when rotating secrets / allowlist.

## Local vs hosted

| | Local | Lambda |
|---|---|---|
| Entry | `npm run dev` (Express) | Function URL → `index.handler` |
| Storage | SQLite (`STORAGE_BACKEND=sqlite`) | DynamoDB |
| Allowlist | `config/allowlist.json` | `ALLOWLIST_JSON` |
| Webhook ack | 200 then background queue | **await** full flow, then 200 |
| Public URL | ngrok / cloudflared tunnel | Function URL |

Do not run local tunnel and Lambda against the same Meta webhook at the same time.

## Security notes

- API credentials stay on the server/Lambda only — never in a browser or public repo.
- Embed tokens are minted per persona with dataset + tenant row filters.
- Rotate Meta and Luzmo secrets if leaked; update Lambda env and re-verify webhook if the verify token changes.
