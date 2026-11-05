"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ActivityPanel } from "@/components/ActivityPanel";
import { AnalyticsBlock } from "@/components/AnalyticsBlock";
import type {
  ActivityStep,
  ChatCompletePayload,
  SseEvent,
} from "@/lib/types";

const PROMPTS = [
  {
    id: "product",
    label: "Product",
    text: "How do I invite a teammate to my workspace?",
  },
  {
    id: "account",
    label: "Account",
    text: "What plan is Northstar Health on, and when does it renew?",
  },
  {
    id: "analytics",
    label: "Analytics",
    text: "Has Northstar Health's product adoption declined over the last eight weeks?",
  },
  {
    id: "combined",
    label: "Combined",
    text: "Which of my accounts renewing in the next 60 days have declining product adoption? Show their eight-week usage trend and prepare a short briefing for each one.",
  },
] as const;

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  analytics?: ChatCompletePayload["analytics"];
  confirmationRequired?: boolean;
  forcedDemo?: boolean;
};

function parseSseChunk(buffer: string): { events: SseEvent[]; rest: string } {
  const events: SseEvent[] = [];
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  for (const part of parts) {
    const line = part
      .split("\n")
      .filter((row) => row.startsWith("data:"))
      .map((row) => row.slice(5).trim())
      .join("");
    if (!line) continue;
    try {
      events.push(JSON.parse(line) as SseEvent);
    } catch {
      // ignore malformed chunks
    }
  }
  return { events, rest };
}

export function ChatApp() {
  const [input, setInput] = useState<string>(PROMPTS[0].text);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activity, setActivity] = useState<ActivityStep[]>([]);
  const [turnId, setTurnId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryInDemo, setRetryInDemo] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(true);
  const [liveLuzmo, setLiveLuzmo] = useState(false);
  const [openaiConfigured, setOpenaiConfigured] = useState(false);
  const [embed, setEmbed] = useState<ChatCompletePayload["embed"]>(null);
  const [userName, setUserName] = useState("Avery Chen");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetch("/api/status")
      .then((res) => res.json())
      .then((data: { demoMode: boolean; liveLuzmo: boolean; openaiConfigured: boolean; currentUser: { name: string } }) => {
        setDemoMode(data.demoMode);
        setLiveLuzmo(data.liveLuzmo);
        setOpenaiConfigured(data.openaiConfigured);
        setUserName(data.currentUser.name);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activity, busy]);

  const badge = useMemo(() => {
    if (liveLuzmo) return { label: "Live Luzmo MCP", className: "bg-emerald-100 text-emerald-800" };
    return { label: "Demo mode", className: "bg-amber-100 text-amber-900" };
  }, [liveLuzmo]);

  async function send(message: string, options?: { forceDemo?: boolean }) {
    const trimmed = message.trim();
    if (!trimmed || busy) return;
    const forceDemo = options?.forceDemo ?? false;
    setBusy(true);
    setError(null);
    setRetryInDemo(null);
    setActivity([]);
    setTurnId(null);
    if (!forceDemo) {
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "user", text: trimmed },
      ]);
      setInput("");
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: trimmed, forceDemo }),
      });
      if (!response.body) throw new Error("No response stream");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSseChunk(buffer);
        buffer = parsed.rest;
        for (const event of parsed.events) {
          if (event.type === "status") {
            setDemoMode(event.demoMode);
            setLiveLuzmo(event.liveLuzmo);
            setOpenaiConfigured(event.openaiConfigured);
            setTurnId(event.turnId);
          }
          if (event.type === "activity") {
            setActivity((current) => {
              const next = current.filter((step) => step.id !== event.step.id);
              next.push(event.step);
              return next;
            });
          }
          if (event.type === "error") {
            setError(event.message);
            if (event.demoFallbackAvailable) setRetryInDemo(trimmed);
          }
          if (event.type === "complete") {
            setConversationId(event.payload.conversationId);
            setEmbed(event.payload.embed);
            setDemoMode(event.payload.demoMode);
            setLiveLuzmo(event.payload.liveLuzmo);
            setMessages((current) => [
              ...current,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                text: event.payload.text,
                analytics: event.payload.analytics,
                confirmationRequired: event.payload.confirmationRequired,
                forcedDemo: event.payload.forcedDemo,
              },
            ]);
          }
        }
      }
    } catch {
      setError("The assistant could not complete this turn. Try again.");
      if (!forceDemo) setRetryInDemo(trimmed);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(input);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Product assistant
            </p>
            <h1 className="text-lg font-semibold">Support, accounts, and governed analytics</h1>
            <p className="text-sm text-slate-600">
              Signed in as {userName}. Product Docs and Account Data stay native; analytics go through Luzmo MCP when configured.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
              {badge.label}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
              {openaiConfigured ? "OpenAI orchestration" : "Deterministic demo routing"}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <section className="flex min-h-[70vh] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-medium">Conversation</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PROMPTS.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:border-blue-300 hover:text-blue-700"
                  onClick={() => setInput(prompt.text)}
                >
                  {prompt.label}: {prompt.text.length > 42 ? `${prompt.text.slice(0, 42)}…` : prompt.text}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <p className="text-sm text-slate-500">
                Choose a suggested prompt or ask a follow-up. Product questions use Product Docs, account questions use Account Data, and usage questions use Luzmo or demo analytics.
              </p>
            ) : null}
            {messages.map((message) => (
              <article key={message.id} className={message.role === "user" ? "ml-8" : "mr-4"}>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  {message.role === "user" ? "You" : "Assistant"}
                </p>
                <div
                  className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-50 text-slate-800"
                  }`}
                >
                  {message.text}
                </div>
                {message.forcedDemo ? (
                  <p className="mt-2 text-xs text-amber-700">
                    Demo fallback: routed locally without the model. Analytics are representative fixtures, not a live Luzmo query.
                  </p>
                ) : null}
                {message.confirmationRequired ? (
                  <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Confirmation required before any email, CRM update, or other external action. This demo has no write tools.
                  </p>
                ) : null}
                {message.analytics?.length ? (
                  <div className="mt-3 space-y-3">
                    {message.analytics.map((item, index) => (
                      <AnalyticsBlock
                        key={`${item.account_id ?? "row"}-${index}`}
                        item={item}
                        embed={embed}
                        liveLuzmo={liveLuzmo}
                      />
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
            {busy ? <p className="text-sm text-slate-500">Working…</p> : null}
            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3">
                <p className="text-sm text-rose-700">{error}</p>
                {retryInDemo ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void send(retryInDemo, { forceDemo: true })}
                    className="mt-2 rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    Continue in Demo mode
                  </button>
                ) : null}
              </div>
            ) : null}
            {demoMode && !liveLuzmo ? (
              <p className="text-xs text-slate-400">
                Analytics results in Demo mode are representative fixtures. They are not live Luzmo queries.
              </p>
            ) : null}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={onSubmit} className="border-t border-slate-100 p-4">
            <label className="sr-only" htmlFor="chat-input">
              Message
            </label>
            <textarea
              id="chat-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={3}
              className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
              placeholder="Ask a product, account, or analytics question"
            />
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </form>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium">Agent activity</h2>
          <ActivityPanel steps={activity} turnId={turnId} />
        </aside>
      </main>
    </div>
  );
}
