"use client";

import dynamic from "next/dynamic";
import type { AnalyticsPayload, EmbedCredentials, VisualizationItem } from "@/lib/types";
import { FallbackChart } from "@/components/FallbackChart";

const LuzmoChart = dynamic(
  () => import("@/components/LuzmoChart").then((mod) => mod.LuzmoChart),
  { ssr: false }
);

function isVizItem(value: AnalyticsPayload["visualization"]): value is VisualizationItem {
  return Boolean(
    value &&
      typeof value === "object" &&
      "type" in value &&
      typeof value.type === "string" &&
      value.type.length > 0
  );
}

export function AnalyticsBlock({
  item,
  embed,
  liveLuzmo,
}: {
  item: AnalyticsPayload;
  embed: EmbedCredentials | null;
  liveLuzmo: boolean;
}) {
  const viz = isVizItem(item.visualization) ? item.visualization : null;
  const canRenderLive = liveLuzmo && Boolean(embed) && Boolean(viz);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900">
            {item.account_name ?? "Usage analysis"}
          </h3>
          <p className="text-sm text-slate-600">
            {item.metric ?? "Product adoption"}
            {typeof item.change_percent === "number"
              ? ` · ${item.change_percent}%`
              : ""}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            item.source === "luzmo"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-amber-50 text-amber-800"
          }`}
        >
          {item.source === "luzmo" ? "Live Luzmo MCP" : "Demo analytics"}
        </span>
      </div>
      {item.source === "luzmo" && item.summary ? (
        <details className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          <summary className="cursor-pointer font-medium text-slate-700">Luzmo answer</summary>
          <p className="mt-2 whitespace-pre-wrap leading-6">{item.summary}</p>
        </details>
      ) : item.summary ? (
        <p className="text-sm leading-6 text-slate-700">{item.summary}</p>
      ) : null}
      {item.recommended_follow_up ? (
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-800">Follow-up: </span>
          {item.recommended_follow_up}
        </p>
      ) : null}
      {canRenderLive && embed && viz ? (
        <LuzmoChart item={viz} embed={embed} />
      ) : viz ? (
        <p className="text-sm text-slate-500">
          A flex chart was returned ({viz.type}), but it could not be embedded. Check the Luzmo embed token and dataset access.
        </p>
      ) : item.source === "demo" ? (
        <FallbackChart analytics={item} />
      ) : null}
    </section>
  );
}
