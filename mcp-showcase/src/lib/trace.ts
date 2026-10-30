type Scalar = string | number | boolean | null;
type TraceValue = Scalar | string[];

const SENSITIVE_KEY = /authorization|token|api[_-]?key|authkey|authtoken|password|secret|credential/i;

function redactString(value: string) {
  return value
    .replace(/(Basic|Bearer)\s+\S+/gi, "$1 <redacted>")
    .replace(/\b(sk|rk)-[A-Za-z0-9._-]{8,}/g, "<redacted>");
}

function sanitize(fields: Record<string, TraceValue | undefined>) {
  const clean: Record<string, TraceValue> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (SENSITIVE_KEY.test(key)) {
      clean[key] = "<redacted>";
      continue;
    }
    clean[key] = typeof value === "string" ? redactString(value) : value;
  }
  return clean;
}

export type TurnTrace = {
  turnId: string;
  event: (name: string, fields?: Record<string, TraceValue | undefined>) => void;
  tool: (name: string) => void;
  finish: (
    status: "ok" | "error",
    fields?: Record<string, TraceValue | undefined>
  ) => void;
};

export function startTurn(input: {
  turnId: string;
  conversationId: string;
  mode: "openai" | "demo";
  messageChars: number;
  model?: string;
  liveLuzmo: boolean;
  forceDemo: boolean;
}): TurnTrace {
  const started = performance.now();
  const tools: string[] = [];
  const base = {
    turnId: input.turnId,
    conversationId: input.conversationId,
    mode: input.mode,
  };

  const event: TurnTrace["event"] = (name, fields = {}) => {
    const line = {
      ts: new Date().toISOString(),
      event: name,
      ...base,
      ...sanitize(fields),
    };
    console.log(JSON.stringify(line));
  };

  event("turn.started", {
    model: input.model ?? null,
    messageChars: input.messageChars,
    liveLuzmo: input.liveLuzmo,
    forceDemo: input.forceDemo,
  });

  return {
    turnId: input.turnId,
    event,
    tool(name) {
      tools.push(name);
      event("tool.selected", { tool: name });
    },
    finish(status, fields = {}) {
      event(status === "ok" ? "turn.completed" : "turn.failed", {
        status,
        durationMs: Math.round(performance.now() - started),
        tools,
        ...fields,
      });
    },
  };
}

export function usageCounts(usage: unknown) {
  if (!usage || typeof usage !== "object") return {};
  const record = usage as Record<string, unknown>;
  const pick = (key: string) =>
    typeof record[key] === "number" ? (record[key] as number) : undefined;
  return {
    inputTokens: pick("input_tokens"),
    outputTokens: pick("output_tokens"),
    totalTokens: pick("total_tokens"),
  };
}
