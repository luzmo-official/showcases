"use client";

import type { AnalyticsPayload } from "@/lib/types";

export function FallbackChart({ analytics }: { analytics: AnalyticsPayload }) {
  const series = analytics.series ?? [];
  if (series.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No visualization was returned for this analysis.
      </p>
    );
  }
  const max = Math.max(...series.map((point) => point.value), 1);
  const points = series
    .map((point, index) => {
      const x = (index / Math.max(series.length - 1, 1)) * 320;
      const y = 120 - (point.value / max) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        {analytics.metric ?? "Usage"} · {analytics.period ?? "trend"}
      </p>
      <svg viewBox="0 0 320 140" className="h-36 w-full" role="img" aria-label="Usage trend">
        <polyline
          fill="none"
          stroke="#2563eb"
          strokeWidth="3"
          points={points}
        />
        {series.map((point, index) => {
          const x = (index / Math.max(series.length - 1, 1)) * 320;
          const y = 120 - (point.value / max) * 100;
          return <circle key={point.week} cx={x} cy={y} r="4" fill="#1d4ed8" />;
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
        {series.map((point) => (
          <span key={point.week}>{point.week}</span>
        ))}
      </div>
    </div>
  );
}
