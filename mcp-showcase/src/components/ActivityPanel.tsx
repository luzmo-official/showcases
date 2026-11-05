"use client";

import type { ActivityStep } from "@/lib/types";

const statusClass: Record<ActivityStep["status"], string> = {
  pending: "bg-slate-200 text-slate-700",
  complete: "bg-emerald-100 text-emerald-800",
  error: "bg-rose-100 text-rose-800",
};

export function ActivityPanel({
  steps,
  turnId,
}: {
  steps: ActivityStep[];
  turnId?: string | null;
}) {
  return (
    <div className="space-y-3">
      {turnId ? (
        <p className="font-mono text-[11px] text-slate-400">turn {turnId}</p>
      ) : null}
      {steps.length === 0 ? (
        <p className="text-sm text-slate-500">
          Tool activity appears here as the assistant chooses Product Docs, Account Data, or Luzmo.
        </p>
      ) : (
        <ol className="space-y-3">
      {steps.map((step) => (
        <li key={step.id} className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-900">{step.label}</p>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClass[step.status]}`}>
              {step.status}
            </span>
          </div>
          <p className="text-sm leading-5 text-slate-600">{step.explanation}</p>
        </li>
      ))}
        </ol>
      )}
    </div>
  );
}
