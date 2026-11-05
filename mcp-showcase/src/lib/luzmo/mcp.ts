import type { FunctionTool } from "openai/resources/responses/responses";
import { luzmoMcpUrl, mcpAuthorization, mcpHeaders } from "@/lib/env";

const PROTOCOL = "2025-06-18";
const READ_TOOLS = ["search_datasets", "answer_question", "create_chart"] as const;
const TOOL_TTL_MS = 5 * 60 * 1000;

export function isLuzmoTool(name: string) {
  return (READ_TOOLS as readonly string[]).includes(name);
}

export function isLuzmoAnalyticsTool(name: string) {
  return name === "answer_question" || name === "create_chart";
}

type ListedTool = {
  name: string;
  description?: string;
  inputSchema?: unknown;
};

type Session = {
  listTools: () => Promise<ListedTool[]>;
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  close: () => Promise<void>;
};

const FALLBACK_PARAMETERS: Record<(typeof READ_TOOLS)[number], Record<string, unknown>> = {
  search_datasets: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Dataset name or topic to search.",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  answer_question: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description:
          "Analytics question. Include authorized account_id values when the question is about specific accounts.",
      },
    },
    required: ["question"],
    additionalProperties: false,
  },
  create_chart: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description:
          "Chart to create. Include authorized account_id values when the chart is about specific accounts.",
      },
    },
    required: ["question"],
    additionalProperties: false,
  },
};

const GUIDANCE: Record<(typeof READ_TOOLS)[number], string> = {
  search_datasets: "Browse datasets before an analytics question only when you need column or dataset ids.",
  answer_question:
    "Prefer this for metrics, trends, comparisons, and charts. Include account_id values returned by query_account_data. The host renders flex charts; you receive text only.",
  create_chart:
    "Use when the user wants a chart built from a prompt. Include account_id values returned by query_account_data. The host renders the flex chart.",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function redact(value: string) {
  return value
    .replace(/(Basic|Bearer)\s+\S+/gi, "$1 <redacted>")
    .replace(/\b(sk|rk)-[A-Za-z0-9._-]{8,}/g, "<redacted>")
    .slice(0, 500);
}

function authHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  const authorization = mcpAuthorization();
  if (authorization) headers.Authorization = authorization;
  const extra = mcpHeaders();
  if (extra) Object.assign(headers, extra);
  return headers;
}

function parseSse(body: string, requestId: number) {
  const messages: unknown[] = [];
  for (const block of body.split("\n\n")) {
    const data = block
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");
    if (!data || data === "[DONE]") continue;
    try {
      messages.push(JSON.parse(data) as unknown);
    } catch {
      // Ignore non-JSON SSE comments.
    }
  }
  const matched = messages.find((message) => {
    if (!isRecord(message) || !("result" in message || "error" in message)) return false;
    return message.id === requestId || message.id === String(requestId);
  });
  return matched ?? messages.find((message) => isRecord(message) && ("result" in message || "error" in message));
}

async function readRpc(response: Response, requestId: number): Promise<unknown> {
  if (response.status === 202 || response.status === 204) return null;
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Luzmo MCP returned HTTP ${response.status}. ${redact(body)}`);
  }
  if (!body.trim()) return null;
  const contentType = response.headers.get("content-type") ?? "";
  const payload =
    contentType.includes("text/event-stream") || body.includes("\ndata:")
      ? parseSse(body, requestId)
      : (JSON.parse(body) as unknown);
  if (!isRecord(payload)) return payload;
  if (payload.error) {
    const message = isRecord(payload.error) && typeof payload.error.message === "string"
      ? payload.error.message
      : "Luzmo MCP rejected the request.";
    throw new Error(redact(message));
  }
  return "result" in payload ? payload.result : payload;
}

async function handshake(): Promise<Session> {
  const url = luzmoMcpUrl();
  const headers = authHeaders();
  let id = 1;
  const sessionHeaders: Record<string, string> = {};

  const post = async (message: Record<string, unknown>, timeoutMs: number) => {
    const requestId = typeof message.id === "number" ? message.id : id;
    const response = await fetch(url, {
      method: "POST",
      headers: { ...headers, ...sessionHeaders },
      body: JSON.stringify(message),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const sessionId = response.headers.get("mcp-session-id");
    if (sessionId) sessionHeaders["Mcp-Session-Id"] = sessionId;
    return readRpc(response, requestId);
  };

  const initialized = await post(
    {
      jsonrpc: "2.0",
      id: id++,
      method: "initialize",
      params: {
        protocolVersion: PROTOCOL,
        capabilities: {},
        clientInfo: { name: "mcp-kss", version: "0.1.0" },
      },
    },
    20_000
  );
  const negotiated =
    isRecord(initialized) && typeof initialized.protocolVersion === "string"
      ? initialized.protocolVersion
      : PROTOCOL;
  sessionHeaders["MCP-Protocol-Version"] = negotiated;

  await post({ jsonrpc: "2.0", method: "notifications/initialized" }, 20_000).catch(() => undefined);

  return {
    async listTools() {
      const result = await post(
        { jsonrpc: "2.0", id: id++, method: "tools/list", params: {} },
        20_000
      );
      if (!isRecord(result) || !Array.isArray(result.tools)) return [];
      return result.tools.filter((tool): tool is ListedTool => isRecord(tool) && typeof tool.name === "string");
    },
    async callTool(name, args) {
      return post(
        {
          jsonrpc: "2.0",
          id: id++,
          method: "tools/call",
          params: { name, arguments: args },
        },
        90_000
      );
    },
    async close() {
      const sessionId = sessionHeaders["Mcp-Session-Id"];
      if (!sessionId) return;
      await fetch(url, {
        method: "DELETE",
        headers: { ...headers, ...sessionHeaders },
        signal: AbortSignal.timeout(10_000),
      }).catch(() => undefined);
    },
  };
}

async function withSession<T>(fn: (session: Session) => Promise<T>) {
  const session = await handshake();
  try {
    return await fn(session);
  } finally {
    await session.close();
  }
}

function parametersForModel(name: (typeof READ_TOOLS)[number], schema: unknown) {
  if (!isRecord(schema) || schema.type !== "object" || !isRecord(schema.properties)) {
    return { parameters: FALLBACK_PARAMETERS[name], strict: true };
  }
  const parameters = { ...schema };
  delete parameters.$schema;
  delete parameters.$id;
  return { parameters, strict: false };
}

function toFunctionTool(name: (typeof READ_TOOLS)[number], listed?: ListedTool): FunctionTool {
  const { parameters, strict } = parametersForModel(name, listed?.inputSchema);
  const description = [listed?.description, GUIDANCE[name]].filter(Boolean).join(" ");
  return {
    type: "function",
    name,
    description,
    parameters,
    strict,
  };
}

let cachedTools: { at: number; tools: FunctionTool[] } | null = null;

export async function luzmoFunctionTools(): Promise<FunctionTool[]> {
  if (cachedTools && Date.now() - cachedTools.at < TOOL_TTL_MS) return cachedTools.tools;
  try {
    const listed = await withSession((session) => session.listTools());
    const tools = READ_TOOLS.flatMap((name) => {
      const found = listed.find((tool) => tool.name === name);
      return found ? [toFunctionTool(name, found)] : [];
    });
    const resolved = tools.some((tool) => tool.name === "answer_question")
      ? tools
      : [toFunctionTool("answer_question"), ...tools];
    cachedTools = { at: Date.now(), tools: resolved };
    return resolved;
  } catch (error) {
    console.error(
      "[luzmo-mcp] tools/list failed",
      redact(error instanceof Error ? error.message : "unknown error")
    );
    return READ_TOOLS.map((name) => toFunctionTool(name));
  }
}

export async function callLuzmoTool(name: string, args: Record<string, unknown>) {
  return withSession((session) => session.callTool(name, args));
}
