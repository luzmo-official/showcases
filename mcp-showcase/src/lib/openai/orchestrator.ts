import OpenAI from "openai";
import type { Response, ResponseInput, Tool } from "openai/resources/responses/responses";
import { createStep, STEP_COPY } from "@/lib/activity";
import {
  datasetIdsFromVisualizations,
  looksLikeWriteAction,
  stripRepeatedChartJson,
} from "@/lib/analytics/normalize";
import { demoMode, liveLuzmo, openaiModel } from "@/lib/env";
import { mintEmbedCredentials } from "@/lib/luzmo/embed";
import { isLuzmoTool } from "@/lib/luzmo/mcp";
import { executeNativeTool, sanitizeToolOutput } from "@/lib/openai/execute";
import { assistantTools, SYSTEM_INSTRUCTIONS } from "@/lib/openai/tools";
import { getPreviousResponseId, setPreviousResponseId } from "@/lib/sessions";
import type { TurnTrace } from "@/lib/trace";
import { usageCounts } from "@/lib/trace";
import type {
  ActivityStep,
  AnalyticsPayload,
  ChatCompletePayload,
  SseEvent,
  VisualizationItem,
} from "@/lib/types";

type Emit = (event: SseEvent) => void;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function nativeCalls(response: Response) {
  return response.output.filter(
    (item): item is Extract<Response["output"][number], { type: "function_call" }> =>
      item.type === "function_call"
  );
}

function toolRank(name: string) {
  if (name === "search_product_docs" || name === "query_account_data") return 0;
  return 1;
}

function upsert(emit: Emit, steps: ActivityStep[], step: ActivityStep) {
  const index = steps.findIndex((item) => item.id === step.id);
  if (index >= 0) steps[index] = step;
  else steps.push(step);
  emit({ type: "activity", step });
}

function isVisualization(value: AnalyticsPayload["visualization"]): value is VisualizationItem {
  return Boolean(
    value &&
      typeof value === "object" &&
      "type" in value &&
      typeof value.type === "string" &&
      value.type.length > 0
  );
}

export async function runOpenAiTurn(options: {
  conversationId: string;
  message: string;
  emit: Emit;
  trace: TurnTrace;
}): Promise<ChatCompletePayload> {
  const { conversationId, message, emit, trace } = options;
  const steps: ActivityStep[] = [];
  const analytics: AnalyticsPayload[] = [];
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const tools: Tool[] = await assistantTools();

  upsert(
    emit,
    steps,
    createStep("classify", STEP_COPY.classify.label, STEP_COPY.classify.explanation)
  );

  const previous = getPreviousResponseId(conversationId);
  let response = await timedResponse(
    trace,
    client,
    {
      model: openaiModel(),
      instructions: SYSTEM_INSTRUCTIONS,
      input: message,
      tools,
      store: true,
      ...(previous ? { previous_response_id: previous } : {}),
    },
    0
  );

  upsert(
    emit,
    steps,
    createStep("classify", STEP_COPY.classify.label, STEP_COPY.classify.explanation, "complete")
  );

  let usedCrm = false;
  let usedLuzmo = false;
  let usedDemoAnalytics = false;
  let turnAccountIds: string[] = [];
  let loops = 0;

  while (loops < 8) {
    loops += 1;
    const calls = nativeCalls(response).sort((a, b) => toolRank(a.name) - toolRank(b.name));
    if (calls.length === 0) break;

    const outputs: ResponseInput = [];
    for (const call of calls) {
      if (call.name === "search_product_docs") {
        upsert(
          emit,
          steps,
          createStep("docs", STEP_COPY.docs.label, STEP_COPY.docs.explanation, "pending", "docs")
        );
      } else if (call.name === "query_account_data") {
        usedCrm = true;
        upsert(
          emit,
          steps,
          createStep("crm", STEP_COPY.crm.label, STEP_COPY.crm.explanation, "pending", "crm")
        );
      } else if (call.name === "get_usage_analytics") {
        usedDemoAnalytics = true;
        upsert(
          emit,
          steps,
          createStep(
            "demo-analytics",
            STEP_COPY.demoAnalytics.label,
            STEP_COPY.demoAnalytics.explanation,
            "pending",
            "demo-analytics"
          )
        );
      } else if (isLuzmoTool(call.name)) {
        usedLuzmo = true;
        upsert(
          emit,
          steps,
          createStep("luzmo", STEP_COPY.luzmo.label, STEP_COPY.luzmo.explanation, "pending", "luzmo")
        );
      }

      const started = performance.now();
      trace.tool(call.name);
      const run = await executeNativeTool(
        call.name,
        call.arguments,
        conversationId,
        turnAccountIds
      );
      const result = run.forModel;
      if (run.accountIds.length) turnAccountIds = run.accountIds;
      trace.event("tool.completed", {
        tool: call.name,
        source: toolSource(call.name),
        durationMs: Math.round(performance.now() - started),
        success: !run.failed && !(isRecord(result) && result.found === false),
        outputChars: sanitizeToolOutput(result).length,
        feature: run.feature,
        ...(isLuzmoTool(call.name)
          ? { chartCount: run.analytics.filter((item) => isVisualization(item.visualization)).length }
          : {}),
      });

      if (call.name === "search_product_docs") {
        const found = isRecord(result) && result.found === true;
        upsert(
          emit,
          steps,
          createStep(
            "docs",
            STEP_COPY.docs.label,
            found ? STEP_COPY.docs.explanation : "Product documentation has no relevant answer.",
            found ? "complete" : "error",
            "docs"
          )
        );
      }
      if (call.name === "query_account_data") {
        const found = isRecord(result) && result.found === true;
        upsert(
          emit,
          steps,
          createStep(
            "crm",
            STEP_COPY.crm.label,
            found
              ? STEP_COPY.crm.explanation
              : "No matching account records were found, or they are outside the user's scope.",
            found ? "complete" : "error",
            "crm"
          )
        );
      }
      if (call.name === "get_usage_analytics") {
        const found = isRecord(result) && result.found === true;
        analytics.push(...run.analytics);
        upsert(
          emit,
          steps,
          createStep(
            "demo-analytics",
            STEP_COPY.demoAnalytics.label,
            found
              ? STEP_COPY.demoAnalytics.explanation
              : "No analytics data matches the authorized account identifiers.",
            found ? "complete" : "error",
            "demo-analytics"
          )
        );
        if (found) {
          upsert(
            emit,
            steps,
            createStep(
              "receive",
              STEP_COPY.receive.label,
              "Representative demo series received. This did not come from live Luzmo MCP.",
              "complete",
              "demo-analytics"
            )
          );
        }
      }
      if (isLuzmoTool(call.name)) {
        if (run.failed) {
          const detail = isRecord(result) && typeof result.error === "string" ? result.error : "";
          upsert(
            emit,
            steps,
            createStep(
              "luzmo",
              "Luzmo request failed",
              detail || "MCP initialization or authentication failed, or the analytics query returned an error.",
              "error",
              "luzmo"
            )
          );
        } else {
          analytics.push(...run.analytics);
          const chartCount = run.analytics.filter((item) => isVisualization(item.visualization)).length;
          upsert(
            emit,
            steps,
            createStep("luzmo", STEP_COPY.luzmo.label, STEP_COPY.luzmo.explanation, "complete", "luzmo")
          );
          upsert(
            emit,
            steps,
            createStep(
              "receive",
              STEP_COPY.receive.label,
              chartCount
                ? `Extracted ${chartCount} flex chart${chartCount === 1 ? "" : "s"} for this page. The assistant receives the written answer only.`
                : "Luzmo returned a written answer and no flex chart.",
              "complete",
              "luzmo"
            )
          );
        }
      }

      outputs.push({
        type: "function_call_output",
        call_id: call.call_id,
        output: sanitizeToolOutput(result),
      });
    }

    response = await timedResponse(
      trace,
      client,
      {
        model: openaiModel(),
        instructions: SYSTEM_INSTRUCTIONS,
        input: outputs,
        tools,
        previous_response_id: response.id,
        store: true,
      },
      loops
    );
  }

  if (usedCrm && (usedLuzmo || usedDemoAnalytics)) {
    upsert(
      emit,
      steps,
      createStep("combined", STEP_COPY.combined.label, STEP_COPY.combined.explanation, "complete")
    );
  }

  upsert(
    emit,
    steps,
    createStep("prepare", STEP_COPY.prepare.label, STEP_COPY.prepare.explanation, "complete")
  );

  setPreviousResponseId(conversationId, response.id);
  const text =
    stripRepeatedChartJson(response.output_text?.trim() || "") ||
    "I could not prepare an answer from the available tools.";
  const visualizations = analytics.flatMap((item) =>
    isVisualization(item.visualization) ? [item.visualization] : []
  );
  const embed = liveLuzmo()
    ? await mintEmbedCredentials(datasetIdsFromVisualizations(visualizations))
    : null;

  return {
    conversationId,
    text,
    activity: steps,
    analytics,
    embed,
    liveLuzmo: liveLuzmo(),
    demoMode: demoMode(),
    openaiConfigured: true,
    confirmationRequired: looksLikeWriteAction(text),
    forcedDemo: false,
    turnId: trace.turnId,
  };
}

function toolSource(name: string) {
  if (name === "search_product_docs") return "docs";
  if (name === "get_usage_analytics") return "demo-analytics";
  if (name === "query_account_data") return "crm";
  if (isLuzmoTool(name)) return "luzmo";
  return "native";
}

async function timedResponse(
  trace: TurnTrace,
  client: OpenAI,
  params: Parameters<OpenAI["responses"]["create"]>[0],
  iteration: number
) {
  const started = performance.now();
  const response = await client.responses.create(params);
  if (!("output" in response)) {
    throw new Error("Expected a completed OpenAI response.");
  }
  const counts = usageCounts("usage" in response ? response.usage : undefined);
  trace.event("openai.completed", {
    iteration,
    durationMs: Math.round(performance.now() - started),
    responseId: response.id,
    ...counts,
  });
  return response;
}
