# Luzmo MCP product assistant demo

A sample product assistant that already answers support and account questions, then adds **governed analytics through Luzmo MCP**. The point is routing, not a Luzmo-only chatbot.

- Product how-to questions use local documentation.
- Billing and account questions use a mock CRM.
- Usage and trend questions use Luzmo’s hosted MCP when credentials are present.
- Combined questions can call CRM first, then analytics.

The browser talks only to this app’s backend. OpenAI and Luzmo credentials stay on the server.

## Run

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Server-side key for the Responses API. If omitted, the app uses deterministic demo routing. |
| `OPENAI_MODEL` | Model id (default `gpt-4.1`). |
| `LUZMO_MCP_URL` | Hosted MCP endpoint (default `https://api.luzmo.com/0.1.0/mcp`). |
| `LUZMO_MCP_AUTHORIZATION` | Optional `Authorization` value forwarded to MCP. |
| `LUZMO_AUTH_KEY` / `LUZMO_AUTH_TOKEN` | Luzmo key and token. Sent as MCP headers (`authKey` / `authToken`). When dataset IDs are set, also used to mint a short-lived **embed** token for charts. |
| `LUZMO_DATASET_IDS` | Comma-separated dataset UUIDs for embed-token scope. |
| `LUZMO_API_HOST` / `LUZMO_APP_SERVER` | Regional API and app hosts. |

Never put keys in the MCP URL. Do not expose OpenAI or Luzmo secrets to the browser.

## Demo prompts

1. **Product:** How do I invite a teammate to my workspace?
2. **Account:** What plan is Northstar Health on, and when does it renew?
3. **Analytics:** Has Northstar Health's product adoption declined over the last eight weeks?
4. **Combined:** Which of my accounts renewing in the next 60 days have declining product adoption?

## Modes

- **Demo mode** (no Luzmo config): representative CRM, docs, and usage results. The activity trace still shows routing. Results are not live Luzmo queries.
- **Demo fallback**: if a model call fails mid-demo (no credits, rate limit, outage), the error states the cause and offers a **Continue in Demo mode** button. That turn is routed locally and labeled as fixtures so it never reads as a live Luzmo result.
- **Live Luzmo MCP**: this app handshakes with Luzmo MCP, calls `search_datasets`, `answer_question`, and `create_chart`, and keeps flex chart JSON for `LuzmoVizItemComponent`. The model receives the written answer only. The raw Luzmo answer stays behind “Luzmo answer” on the chart card. Set `LUZMO_AGENT_ID` to run those tools through a saved Luzmo Agent.

The signed-in demo user is Avery Chen. CRM access is limited to accounts they own.

## Stack

Next.js App Router, OpenAI Responses API (function tools + remote MCP), mock docs/CRM, optional `@luzmo/nodejs-sdk` embed tokens and `@luzmo/react-embed` charts.
