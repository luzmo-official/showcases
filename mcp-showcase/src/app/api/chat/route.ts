import { demoMode, liveLuzmo, openaiConfigured, openaiModel } from "@/lib/env";
import { runDemoTurn } from "@/lib/demo/orchestrator";
import { runOpenAiTurn } from "@/lib/openai/orchestrator";
import { startTurn } from "@/lib/trace";
import type { SseEvent } from "@/lib/types";

export const runtime = "nodejs";

function encode(event: SseEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

// Tool traces and errors are shown to demo participants, so redact anything
// credential-shaped before it leaves the server.
function redact(text: string) {
  return text
    .replace(/(Basic|Bearer)\s+[A-Za-z0-9+/=._-]+/gi, "$1 <redacted>")
    .replace(/\b(sk|rk)-[A-Za-z0-9._-]{8,}/g, "<redacted>")
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
      "<redacted>"
    );
}

function describeTurnFailure(error: unknown) {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? (error as { status?: number }).status
      : undefined;
  const detail = error instanceof Error ? redact(error.message) : "";

  if (status === 401 || status === 403) {
    return "OpenAI rejected the request credentials. Check OPENAI_API_KEY on the server.";
  }
  if (status === 404) {
    return `The configured model is unavailable. Check OPENAI_MODEL. ${detail}`.trim();
  }
  if (status === 429) {
    return `OpenAI declined the request. ${detail}`.trim();
  }
  if (/mcp/i.test(detail)) {
    return `Luzmo MCP initialization or authentication failed. ${detail}`.trim();
  }
  return detail
    ? `The assistant could not complete this turn. ${detail}`
    : "The assistant could not complete this turn. Check the server logs for details.";
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    conversationId?: string;
    message?: string;
    forceDemo?: boolean;
  };
  const message = body.message?.trim() ?? "";
  const conversationId = body.conversationId?.trim() || crypto.randomUUID();
  const forceDemo = body.forceDemo === true;

  if (!message) {
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        event: "turn.rejected",
        reason: "empty_message",
      })
    );
    return new Response(encode({ type: "error", message: "Enter a question to continue." }), {
      status: 400,
      headers: { "Content-Type": "text/event-stream; charset=utf-8" },
    });
  }

  const turnId = crypto.randomUUID();
  const useModel = openaiConfigured() && !forceDemo;
  const trace = startTurn({
    turnId,
    conversationId,
    mode: useModel ? "openai" : "demo",
    messageChars: message.length,
    model: useModel ? openaiModel() : undefined,
    liveLuzmo: liveLuzmo(),
    forceDemo,
  });

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: SseEvent) => {
        controller.enqueue(new TextEncoder().encode(encode(event)));
      };
      try {
        emit({
          type: "status",
          demoMode: demoMode(),
          liveLuzmo: liveLuzmo(),
          openaiConfigured: openaiConfigured(),
          turnId,
        });
        const payload = useModel
          ? await runOpenAiTurn({ conversationId, message, emit, trace })
          : await runDemoTurn({
              conversationId,
              message,
              emit,
              forcedDemo: forceDemo,
              trace,
            });
        trace.finish("ok", {
          responseChars: payload.text.length,
          analyticsCount: payload.analytics.length,
          hasChart: payload.analytics.some((item) => {
            const visualization = item.visualization;
            return Boolean(
              visualization &&
                typeof visualization === "object" &&
                "type" in visualization &&
                typeof visualization.type === "string"
            );
          }),
        });
        emit({ type: "complete", payload: { ...payload, turnId } });
      } catch (error) {
        trace.finish("error", {
          message: describeTurnFailure(error),
        });
        emit({
          type: "error",
          message: describeTurnFailure(error),
          demoFallbackAvailable: !forceDemo,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
