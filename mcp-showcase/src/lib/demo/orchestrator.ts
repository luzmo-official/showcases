import { createStep, STEP_COPY } from "@/lib/activity";
import { decliningAccounts, getUsageAnalytics } from "@/lib/analytics/demo";
import {
  CURRENT_USER,
  queryAccountData,
} from "@/lib/crm/mock-accounts";
import { searchMarkdownFiles } from "@/lib/docs/search";
import { demoMode, liveLuzmo, openaiConfigured } from "@/lib/env";
import { rememberAccountIds } from "@/lib/sessions";
import type { TurnTrace } from "@/lib/trace";
import type {
  ActivityStep,
  AnalyticsPayload,
  ChatCompletePayload,
  SseEvent,
} from "@/lib/types";

type Emit = (event: SseEvent) => void;

export type DemoRoute = "docs" | "account" | "analytics" | "combined" | "clarify";

export function classifyDemoIntent(message: string): DemoRoute {
  const text = message.toLowerCase();
  const renew = /renew/.test(text);
  const declineOrUsage = /declin|adopt|usage|trend|weekly|metric/.test(text);
  const portfolio = /which of my|accounts renewing|renewing accounts/.test(text);
  if ((renew && declineOrUsage) || (portfolio && declineOrUsage)) return "combined";
  if (declineOrUsage || /visuali|chart|analy/.test(text)) return "analytics";
  if (/plan|renew|billing|owner|subscription|account/.test(text)) return "account";
  if (/invite|teammate|how do i|setup|workspace|troubleshoot|sign in/.test(text)) {
    return "docs";
  }
  return "clarify";
}

function extractAccountName(message: string) {
  const match = message.match(/northstar health|harbor logistics|brightline education|summit retail|cascade bank/i);
  return match?.[0] ?? "Northstar Health";
}

function upsert(emit: Emit, steps: ActivityStep[], step: ActivityStep) {
  const index = steps.findIndex((item) => item.id === step.id);
  if (index >= 0) steps[index] = step;
  else steps.push(step);
  emit({ type: "activity", step });
}

function complete(emit: Emit, steps: ActivityStep[], id: string, copy: { label: string; explanation: string }, source?: ActivityStep["source"]) {
  upsert(emit, steps, createStep(id, copy.label, copy.explanation, "complete", source));
}

export async function runDemoTurn(options: {
  conversationId: string;
  message: string;
  emit: Emit;
  forcedDemo?: boolean;
  trace: TurnTrace;
}): Promise<ChatCompletePayload> {
  const { conversationId, message, emit, forcedDemo = false, trace } = options;
  const steps: ActivityStep[] = [];
  const analytics: AnalyticsPayload[] = [];
  const route = classifyDemoIntent(message);
  trace.event("demo.routed", { route });
  if (route === "docs") trace.tool("search_product_docs");
  if (route === "account") trace.tool("query_account_data");
  if (route === "analytics") {
    trace.tool("query_account_data");
    trace.tool("get_usage_analytics");
  }
  if (route === "combined") {
    trace.tool("query_account_data");
    trace.tool("get_usage_analytics");
  }

  if (forcedDemo) {
    complete(emit, steps, "fallback", {
      label: "Continuing without the model",
      explanation:
        "OpenAI was unavailable for this turn. Routing and results below come from local demo fixtures.",
    }, "system");
  }

  complete(emit, steps, "classify", STEP_COPY.classify);

  let text = "";
  const userId = CURRENT_USER.id;

  if (route === "clarify") {
    text =
      "I can help with product how-to questions, account and billing facts, or product-usage analytics. Which of those do you need?";
  }

  if (route === "docs") {
    complete(emit, steps, "docs", STEP_COPY.docs, "docs");
    const result = await searchMarkdownFiles(message);
    if (!result.found) {
      upsert(
        emit,
        steps,
        createStep(
          "docs",
          STEP_COPY.docs.label,
          "Product documentation has no relevant answer.",
          "error",
          "docs"
        )
      );
      text = "I could not find matching help content for that question.";
    } else {
      const top = result.results[0];
      text = `${top.body.trim()}\n\nDocumentation: ${top.title}`;
    }
  }

  if (route === "account") {
    upsert(
      emit,
      steps,
      createStep("crm", STEP_COPY.crm.label, STEP_COPY.crm.explanation, "pending", "crm")
    );
    const result = queryAccountData(userId, {
      accountName: extractAccountName(message),
    });
    if (!result.found) {
      upsert(
        emit,
        steps,
        createStep(
          "crm",
          STEP_COPY.crm.label,
          "The account cannot be found, or you do not have access.",
          "error",
          "crm"
        )
      );
      text = "I could not find that account in the account records you can access.";
    } else {
      const account = result.accounts[0];
      rememberAccountIds(conversationId, [account.account_id]);
      complete(emit, steps, "crm", STEP_COPY.crm, "crm");
      text = `${account.account_name} is on the ${account.plan} plan. It renews on ${account.renewal_date}. The account owner is ${account.owner} (${account.segment} segment).`;
    }
  }

  if (route === "analytics") {
    complete(emit, steps, "crm", {
      label: "Resolving the approved account identifier",
      explanation: "Account context is required before any usage analysis.",
    }, "crm");
    const lookup = queryAccountData(userId, {
      accountName: extractAccountName(message),
    });
    if (!lookup.found) {
      text = "I could not resolve an authorized account identifier for analytics.";
    } else {
      const account = lookup.accounts[0];
      rememberAccountIds(conversationId, [account.account_id]);
      complete(
        emit,
        steps,
        "demo-analytics",
        STEP_COPY.demoAnalytics,
        "demo-analytics"
      );
      const usage = getUsageAnalytics([account.account_id], userId);
      if (!usage.found) {
        text = usage.error;
      } else {
        analytics.push(...usage.results);
        complete(emit, steps, "receive", {
          label: STEP_COPY.receive.label,
          explanation:
            "Representative demo series received. This did not come from live Luzmo MCP.",
        }, "demo-analytics");
        const row = usage.results[0];
        text = `${row.account_name}: ${row.summary} Adoption changed by ${row.change_percent}% over ${row.period}. ${row.recommended_follow_up}`;
      }
    }
  }

  if (route === "combined") {
    complete(emit, steps, "crm", STEP_COPY.crm, "crm");
    const accountResult = queryAccountData(userId, {
      renewingWithinDays: 60,
    });
    const accounts = accountResult.accounts;
    rememberAccountIds(
      conversationId,
      accounts.map((account) => account.account_id)
    );
    complete(
      emit,
      steps,
      "demo-analytics",
      STEP_COPY.demoAnalytics,
      "demo-analytics"
    );
    const usage = getUsageAnalytics(
      accounts.map((account) => account.account_id),
      userId
    );
    const declining = decliningAccounts(usage.results);
    analytics.push(...declining);
    complete(emit, steps, "combined", STEP_COPY.combined);
    complete(emit, steps, "receive", {
      label: STEP_COPY.receive.label,
      explanation:
        "Representative demo series received. This did not come from live Luzmo MCP.",
    }, "demo-analytics");
    if (declining.length === 0) {
      text =
        "None of your accounts renewing in the next 60 days show declining product adoption in the demo data.";
    } else {
      text = declining
        .map((row) => {
          const account = accounts.find((item) => item.account_id === row.account_id);
          return [
            `## ${row.account_name}`,
            `Plan: ${account?.plan ?? "unknown"} · Renews ${account?.renewal_date ?? "unknown"} · Owner ${account?.owner ?? "unknown"}`,
            `${row.summary} Adoption changed by ${row.change_percent}% over ${row.period}.`,
            `Follow-up: ${row.recommended_follow_up}`,
          ].join("\n");
        })
        .join("\n\n");
    }
  }

  complete(emit, steps, "prepare", STEP_COPY.prepare);

  return {
    conversationId,
    text,
    activity: steps,
    analytics,
    embed: null,
    liveLuzmo: liveLuzmo(),
    demoMode: demoMode(),
    openaiConfigured: openaiConfigured(),
    confirmationRequired: false,
    forcedDemo,
    turnId: trace.turnId,
  };
}
