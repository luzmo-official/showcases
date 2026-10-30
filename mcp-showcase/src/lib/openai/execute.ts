import {
  luzmoAnalytics,
  luzmoModelPayload,
  parseMcpResult,
} from "@/lib/analytics/normalize";
import { getUsageAnalytics } from "@/lib/analytics/demo";
import {
  CURRENT_USER,
  getAccessibleAccountIds,
  queryAccountData,
} from "@/lib/crm/mock-accounts";
import { searchMarkdownFiles } from "@/lib/docs/search";
import { callLuzmoTool, isLuzmoAnalyticsTool, isLuzmoTool } from "@/lib/luzmo/mcp";
import { rememberAccountIds } from "@/lib/sessions";
import type { AnalyticsPayload } from "@/lib/types";

const QUESTION_KEYS = ["question", "prompt", "query", "input", "message"];

function parseArgs(raw: string): Record<string, unknown> {
  try {
    const value = JSON.parse(raw) as unknown;
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function withAuthorizedAccounts(args: Record<string, unknown>, accountIds: string[]) {
  if (accountIds.length === 0) return args;
  const key = QUESTION_KEYS.find((name) => typeof args[name] === "string");
  if (!key) return args;
  const current = String(args[key]);
  const missing = accountIds.filter((id) => id && !current.includes(id));
  if (missing.length === 0) return args;
  return {
    ...args,
    [key]: `${current}\n\nAuthorized account_ids: ${missing.join(", ")}. Limit the analysis to these accounts.`,
  };
}

export type ToolRun = {
  forModel: unknown;
  analytics: AnalyticsPayload[];
  accountIds: string[];
  feature: string;
  failed: boolean;
};

function done(
  forModel: unknown,
  extras: Partial<Omit<ToolRun, "forModel">> = {}
): ToolRun {
  return {
    forModel,
    analytics: [],
    accountIds: [],
    feature: "not applicable",
    failed: false,
    ...extras,
  };
}

export async function executeNativeTool(
  name: string,
  rawArguments: string,
  conversationId: string,
  accountIds: string[] = []
): Promise<ToolRun> {
  const args = parseArgs(rawArguments);
  const userId = CURRENT_USER.id;

  if (isLuzmoTool(name)) {
    try {
      const argsForCall = isLuzmoAnalyticsTool(name)
        ? withAuthorizedAccounts(args, accountIds)
        : args;
      const raw = await callLuzmoTool(name, argsForCall);
      const parsed = parseMcpResult(raw);
      return done(luzmoModelPayload(parsed), {
        analytics: luzmoAnalytics(parsed),
        feature: parsed.feature,
        failed: parsed.isError,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Luzmo MCP request failed.";
      return done({ error: message }, { failed: true });
    }
  }

  switch (name) {
    case "search_product_docs": {
      const result = await searchMarkdownFiles(asString(args.question));
      return done(result);
    }
    case "query_account_data": {
      const result = queryAccountData(userId, {
        accountName:
          typeof args.account_name === "string" ? asString(args.account_name) : undefined,
        renewingWithinDays: asOptionalNumber(args.renewing_within_days),
      });
      const ids = result.found ? result.accounts.map((account) => account.account_id) : [];
      if (ids.length) rememberAccountIds(conversationId, ids);
      return done(result, { accountIds: ids });
    }
    case "get_usage_analytics": {
      const requested = asStringArray(args.account_ids);
      const allowed = new Set(getAccessibleAccountIds(userId));
      const scoped = requested.filter((id) => allowed.has(id));
      const result = getUsageAnalytics(scoped, userId);
      return done(result, { analytics: result.results, failed: !result.found });
    }
    default:
      return done({ error: `Unknown function: ${name}` }, { failed: true });
  }
}

export function sanitizeToolOutput(value: unknown): string {
  return JSON.stringify(value);
}
