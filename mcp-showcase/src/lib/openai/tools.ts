import type { FunctionTool, Tool } from "openai/resources/responses/responses";
import { liveLuzmo } from "@/lib/env";
import { luzmoFunctionTools } from "@/lib/luzmo/mcp";

const functionParameters = {
  search_product_docs: {
    type: "object",
    properties: {
      question: { type: "string" },
    },
    required: ["question"],
    additionalProperties: false,
  },
  query_account_data: {
    type: "object",
    properties: {
      account_name: {
        type: ["string", "null"],
        description: "Exact account name, or null for a portfolio query.",
      },
      renewing_within_days: {
        type: ["number", "null"],
        description: "Renewal window in days, or null when no renewal filter is needed.",
      },
    },
    required: ["account_name", "renewing_within_days"],
    additionalProperties: false,
  },
  get_usage_analytics: {
    type: "object",
    properties: {
      account_ids: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["account_ids"],
    additionalProperties: false,
  },
} as const;

function fn(
  name: keyof typeof functionParameters,
  description: string
): FunctionTool {
  return {
    type: "function",
    name,
    description,
    parameters: functionParameters[name],
    strict: true,
  };
}

export const SYSTEM_INSTRUCTIONS = `
You are a product and account assistant for a workspace product.

Route each part of a question to the tool that owns it:
- search_product_docs: product how-to, setup, configuration, and troubleshooting.
- query_account_data: account, plan, billing, owner, renewal, and portfolio records. Filter by an exact account name, a renewal window, or both. It returns the account_ids the current user may access.
- Luzmo tools: analysis, aggregation, comparisons, trends, metrics, and charts of product-usage data. Prefer answer_question.
- get_usage_analytics: representative demo analytics only when Luzmo tools are not available. Call it only with account_ids from query_account_data.

When a question needs more than one source, call the tools in sequence and feed the earlier result into the later call. Resolve account_ids with query_account_data before any analytics tool, then include those ids in the analytics question. Do not call the tools in parallel.
Do not call an analytics tool for ordinary documentation or record lookups.
Never invent account identifiers, CRM fields, metric values, chart JSON, or analytical results.
Only query analytics for accounts returned by an authorized account lookup or already present in this conversation.
Flex charts are rendered by the application. Use the text returned by Luzmo to write the answer, and do not repeat chart JSON, slots, or raw tool payloads.
Ask for confirmation before performing an external write or communication action. You have no write tools; do not pretend to send email or update CRM records.
`.trim();

export async function assistantTools(): Promise<Tool[]> {
  const tools: Tool[] = [
    fn(
      "search_product_docs",
      "Search product documentation. Use for how-to, setup, configuration, and troubleshooting questions."
    ),
    fn(
      "query_account_data",
      "Query account records the current user is allowed to access. Filter by an exact account name, a renewal window in days, or both. Returns account_ids. Call this before analytics whenever the question mentions accounts, plans, owners, renewals, or a portfolio."
    ),
  ];

  if (liveLuzmo()) {
    tools.push(...(await luzmoFunctionTools()));
  } else {
    tools.push(
      fn(
        "get_usage_analytics",
        "Retrieve representative demo product-usage analytics for authorized account_ids. This is not a live Luzmo query. Only call with account_ids returned by query_account_data."
      )
    );
  }

  return tools;
}
