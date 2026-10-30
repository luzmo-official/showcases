import type { AnalyticsPayload, VisualizationItem } from "@/lib/types";

const MCP_CONTENT_TYPES = new Set([
  "text",
  "image",
  "audio",
  "resource",
  "resource_link",
]);

export type ParsedMcpResult = {
  text: string;
  visualizations: VisualizationItem[];
  feature: string;
  conversationId?: string;
  isError: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function looksLikeJson(value: string) {
  return value.startsWith("{") || value.startsWith("[");
}

function asFlexItem(value: unknown): VisualizationItem | null {
  if (!isRecord(value)) return null;
  const type = value.type;
  if (typeof type !== "string" || !type || type === "item" || type === "dashboard") return null;
  if (
    MCP_CONTENT_TYPES.has(type) &&
    !Array.isArray(value.slots) &&
    !isRecord(value.options)
  ) {
    return null;
  }
  const slots = value.slots;
  const flexSlots =
    Array.isArray(slots) &&
    slots.every((slot) => isRecord(slot) && typeof slot.name === "string");
  const hasOptions = isRecord(value.options);
  if (!flexSlots && !(hasOptions && /(?:chart|map|table)$/i.test(type))) return null;
  return {
    type,
    slots: flexSlots ? slots : undefined,
    options: value.options,
    filters: value.filters,
  };
}

function collectFlexItems(
  value: unknown,
  found: VisualizationItem[],
  seen: Set<string>,
  state: { nodes: number },
  depth = 0
) {
  if (state.nodes > 400 || depth > 8) return;
  state.nodes += 1;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!looksLikeJson(trimmed) || trimmed.length > 200_000) return;
    try {
      collectFlexItems(JSON.parse(trimmed), found, seen, state, depth + 1);
    } catch {
      // Prose, not a chart payload.
    }
    return;
  }

  const direct = asFlexItem(value);
  if (direct) {
    const key = JSON.stringify(direct);
    if (!seen.has(key)) {
      seen.add(key);
      found.push(direct);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectFlexItems(item, found, seen, state, depth + 1);
    return;
  }

  if (!isRecord(value)) return;
  if (value.type === "item" && "value" in value) {
    collectFlexItems(value.value, found, seen, state, depth + 1);
  }
  if ("chart" in value) collectFlexItems(value.chart, found, seen, state, depth + 1);
  for (const [key, child] of Object.entries(value)) {
    if (key === "value" || key === "chart") continue;
    collectFlexItems(child, found, seen, state, depth + 1);
  }
}

function proseFromUnknown(value: unknown, depth = 0): string {
  if (depth > 6 || value == null) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (looksLikeJson(trimmed) && trimmed.length <= 200_000) {
      try {
        return proseFromUnknown(JSON.parse(trimmed), depth + 1);
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
  if (asFlexItem(value)) return "";
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (isRecord(item) && item.type === "text" && typeof item.text === "string") {
          return proseFromUnknown(item.text, depth + 1);
        }
        if (isRecord(item) && (item.type === "image" || item.type === "audio" || item.type === "resource")) {
          return "";
        }
        return proseFromUnknown(item, depth + 1);
      })
      .filter(Boolean)
      .join("\n\n");
  }
  if (!isRecord(value)) return "";
  if (isRecord(value.assistant_message)) {
    const nested = proseFromUnknown(value.assistant_message, depth + 1);
    if (nested) return nested;
  }
  if (typeof value.message === "string" && value.message.trim()) {
    const nested = proseFromUnknown(value.message, depth + 1);
    if (nested) return nested;
  }
  for (const key of ["summary", "answer", "output"]) {
    if (typeof value[key] === "string" && value[key].trim()) {
      const nested = proseFromUnknown(value[key], depth + 1);
      if (nested) return nested;
    }
  }
  if (Array.isArray(value.content)) {
    const nested = proseFromUnknown(value.content, depth + 1);
    if (nested) return nested;
  }
  if (value.structuredContent) {
    const nested = proseFromUnknown(value.structuredContent, depth + 1);
    if (nested) return nested;
  }
  return "";
}

function normalizeFeature(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /^unknown$/i.test(trimmed) || /^n\/?a$/i.test(trimmed)) {
    return "not applicable";
  }
  return trimmed;
}

function readFeature(root: unknown) {
  if (!isRecord(root)) return "not applicable";
  const meta = isRecord(root._meta) ? root._meta.feature : undefined;
  const structured = isRecord(root.structuredContent) ? root.structuredContent.feature : undefined;
  for (const candidate of [root.feature, meta, structured]) {
    if (typeof candidate === "string") return normalizeFeature(candidate);
  }
  return "not applicable";
}

function readConversationId(root: unknown, depth = 0): string | undefined {
  if (depth > 6 || root == null) return undefined;
  if (typeof root === "string") {
    const trimmed = root.trim();
    if (!looksLikeJson(trimmed) || trimmed.length > 200_000) return undefined;
    try {
      return readConversationId(JSON.parse(trimmed) as unknown, depth + 1);
    } catch {
      return undefined;
    }
  }
  if (Array.isArray(root)) {
    for (const item of root) {
      const nested = readConversationId(item, depth + 1);
      if (nested) return nested;
    }
    return undefined;
  }
  if (!isRecord(root)) return undefined;
  for (const key of ["conversation_id", "conversationId"]) {
    const value = root[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  for (const value of Object.values(root)) {
    const nested = readConversationId(value, depth + 1);
    if (nested) return nested;
  }
  return undefined;
}

function unwrap(output: unknown): unknown {
  if (typeof output === "string") {
    const trimmed = output.trim();
    if (!looksLikeJson(trimmed)) return output;
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return output;
    }
  }
  if (isRecord(output) && output.jsonrpc === "2.0" && "result" in output) {
    return output.result;
  }
  return output;
}

export function parseMcpResult(output: unknown): ParsedMcpResult {
  const root = unwrap(output);
  const visualizations: VisualizationItem[] = [];
  collectFlexItems(root, visualizations, new Set(), { nodes: 0 });
  return {
    text: proseFromUnknown(root).slice(0, 4000),
    visualizations,
    feature: readFeature(root),
    conversationId: readConversationId(root),
    isError: isRecord(root) && root.isError === true,
  };
}

export function luzmoModelPayload(parsed: ParsedMcpResult) {
  if (parsed.isError) {
    return {
      error: parsed.text || "Luzmo could not answer that question.",
      feature: parsed.feature,
    };
  }
  return {
    text:
      parsed.text ||
      (parsed.visualizations.length
        ? "Luzmo produced a chart without a written answer."
        : "Luzmo returned no written answer."),
    charts_rendered_in_ui: parsed.visualizations.length,
    feature: parsed.feature,
    ...(parsed.conversationId ? { conversationId: parsed.conversationId } : {}),
    ...(parsed.visualizations.length
      ? {
          note: "Flex charts are rendered in the product UI. Do not repeat chart JSON or this tool payload.",
        }
      : {}),
  };
}

export function luzmoAnalytics(parsed: ParsedMcpResult): AnalyticsPayload[] {
  if (parsed.isError) return [];
  if (parsed.visualizations.length === 0) {
    if (!parsed.text) return [];
    return [
      {
        source: "luzmo",
        summary: parsed.text,
        visualization: null,
        metric: "Product usage",
        period: "as requested",
      },
    ];
  }
  return parsed.visualizations.map((visualization, index) => ({
    source: "luzmo" as const,
    summary: index === 0 ? parsed.text : undefined,
    visualization,
    metric: visualization.type.replace(/-/g, " "),
    period: "as requested",
  }));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function datasetIdsFromVisualizations(items: VisualizationItem[]) {
  const ids = new Set<string>();
  const walk = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    const record = value as Record<string, unknown>;
    for (const key of ["datasetId", "dataset_id"]) {
      const id = record[key];
      if (typeof id === "string" && UUID.test(id)) ids.add(id);
    }
    Object.values(record).forEach(walk);
  };
  items.forEach(walk);
  return [...ids];
}

export function stripRepeatedChartJson(text: string) {
  const withoutFences = text.replace(/```(?:json)?\s*([\s\S]*?)```/g, (fence, body: string) => {
    try {
      const parsed = JSON.parse(body.trim()) as unknown;
      const items: VisualizationItem[] = [];
      collectFlexItems(parsed, items, new Set(), { nodes: 0 });
      if (items.length > 0) return "";
    } catch {
      return fence;
    }
    return fence;
  });
  return withoutFences.replace(/\n{3,}/g, "\n\n").trim();
}

export function looksLikeWriteAction(text: string) {
  return /\b(send email|email them|update the crm|create a ticket|write to)\b/i.test(text);
}
