'use client';

import React from 'react';
import type { Target } from '@/hooks/usePlatformData';

interface TargetsPageProps {
  targets: Target[];
  loading: boolean;
}

type ActionItem = Target & {
  computedProgress: number;
  source: 'live' | 'seeded';
};

const SEEDED_ACTION_ITEMS: ActionItem[] = [
  {
    name: 'Lane ETA Variance',
    metric: 'LA -> Dallas ETA drift above threshold',
    current: 4.8,
    target: 2.5,
    unit: 'hr',
    year: 2027,
    progress: 62,
    computedProgress: 62,
    source: 'seeded',
  },
  {
    name: 'Dock Queue Congestion',
    metric: 'Inbound queue spikes during 09:00-12:00',
    current: 38,
    target: 25,
    unit: 'min',
    year: 2027,
    progress: 71,
    computedProgress: 71,
    source: 'seeded',
  },
  {
    name: 'Carrier SLA Slippage',
    metric: 'Carrier SLA attainment below weekly baseline',
    current: 87.4,
    target: 93,
    unit: '%',
    year: 2027,
    progress: 78,
    computedProgress: 78,
    source: 'seeded',
  },
  {
    name: 'Exception Backlog',
    metric: 'Open delivery exceptions exceed watch threshold',
    current: 142,
    target: 90,
    unit: 'cases',
    year: 2027,
    progress: 66,
    computedProgress: 66,
    source: 'seeded',
  },
  {
    name: 'Warehouse Throughput Gap',
    metric: 'Processed volume below expected daily run-rate',
    current: 910,
    target: 1200,
    unit: 'shipments/day',
    year: 2027,
    progress: 74,
    computedProgress: 74,
    source: 'seeded',
  },
  {
    name: 'Last-Mile Cost Drift',
    metric: 'Cost per shipment increased in urban zones',
    current: 212,
    target: 185,
    unit: 'USD',
    year: 2027,
    progress: 69,
    computedProgress: 69,
    source: 'seeded',
  },
];

function ShimmerRow() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
          <div className="h-3 w-28 bg-gray-100 rounded" />
        </div>
        <div className="h-5 w-24 bg-gray-200 rounded" />
      </div>
      <div className="h-2.5 w-full bg-gray-100 rounded-full" />
    </div>
  );
}

function isLowerBetter(metric: string): boolean {
  const m = metric.toLowerCase();
  return m.includes('delay') || m.includes('cost') || m.includes('exception') || m.includes('variance');
}

function gapText(target: Target): string {
  const lowerBetter = isLowerBetter(target.metric);
  const diff = lowerBetter ? target.current - target.target : target.target - target.current;
  if (diff <= 0) return 'On target';
  const rounded = Math.round(diff * 10) / 10;
  return lowerBetter ? `${rounded}${target.unit} above target` : `${rounded}${target.unit} below target`;
}

function actionSuggestion(target: Target): string {
  const text = `${target.name} ${target.metric}`.toLowerCase();
  if (text.includes('sla') || text.includes('on-time')) {
    return 'Prioritize lanes with repeated misses, add dispatch buffer on peak days, and review promised-date logic with carrier ops.';
  }
  if (text.includes('carrier') || text.includes('reliability')) {
    return 'Shift volume toward top-performing carriers, enforce weekly scorecards, and trigger root-cause reviews for low-performing partners.';
  }
  if (text.includes('delay') || text.includes('late')) {
    return 'Investigate late clusters by route and warehouse handoff, then introduce exception escalation for high-risk shipments.';
  }
  if (text.includes('dock') || text.includes('warehouse') || text.includes('throughput')) {
    return 'Rebalance staffing by shift, smooth inbound appointment windows, and monitor dock queues to remove bottlenecks.';
  }
  if (text.includes('cost')) {
    return 'Audit premium freight drivers, optimize transport mode mix, and renegotiate lane pricing where variance is persistent.';
  }
  return 'Review breakdown by region, carrier, and route; assign owner + deadline and monitor progress in the next weekly ops review.';
}

function priorityLabel(progress: number): { label: string; tone: string } {
  if (progress < 50) return { label: 'High', tone: 'bg-blue-100 text-blue-900' };
  if (progress < 75) return { label: 'Medium', tone: 'bg-blue-50 text-blue-700' };
  return { label: 'Low', tone: 'bg-blue-50/70 text-blue-600' };
}

function progressTone(progress: number): string {
  if (progress >= 90) return 'bg-blue-900';
  if (progress >= 80) return 'bg-blue-700';
  if (progress >= 70) return 'bg-blue-500';
  return 'bg-blue-300';
}

function scoreTone(progress: number): string {
  if (progress >= 90) return 'text-blue-900';
  if (progress >= 80) return 'text-blue-700';
  if (progress >= 70) return 'text-blue-600';
  return 'text-blue-400';
}

export default function TargetsPage({ targets, loading }: TargetsPageProps) {
  const liveUnderperforming: ActionItem[] = targets
    .filter((t) => t.progress < 90)
    .sort((a, b) => a.progress - b.progress)
    .map((t) => ({ ...t, computedProgress: t.progress, source: 'live' }));

  const actionItems = liveUnderperforming.length > 0 ? liveUnderperforming : SEEDED_ACTION_ITEMS;
  const usingSeededItems = liveUnderperforming.length === 0;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Action Items</h1>
            <p className="text-sm text-gray-500 mt-1">
              Operational recommendations generated from underperforming logistics metrics.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Underperforming</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{actionItems.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">metrics below 90% progress</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Critical</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{actionItems.filter((t) => t.computedProgress < 50).length}</p>
            <p className="text-xs text-gray-500 mt-0.5">priority high action items</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Watchlist</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{targets.filter((t) => t.progress >= 90).length}</p>
            <p className="text-xs text-gray-500 mt-0.5">healthy metrics to monitor</p>
          </div>
        </div>

        {usingSeededItems && !loading && (
          <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/40 px-4 py-2.5">
            <p className="text-[11px] text-blue-800">
              Live underperforming items are currently empty. Showing seeded action cards for planning and demo flow.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <ShimmerRow key={i} />)
            : actionItems.map((t) => {
                  const priority = priorityLabel(t.computedProgress);
                  return (
                <div key={t.name} className="bg-white rounded-xl border border-blue-100 p-4 min-h-[220px]">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{t.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{t.metric}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${priority.tone}`}>
                        {priority.label} Priority
                      </span>
                      <span className="text-xs text-gray-400">Target year: {t.year}</span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2 mb-3">
                    <p className="text-[11px] font-semibold text-blue-900">Recommended Action</p>
                    <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed line-clamp-4">{actionSuggestion(t)}</p>
                  </div>

                  <div className="relative">
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${progressTone(t.computedProgress)}`}
                        style={{ width: `${Math.min(t.computedProgress, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className={`text-xs font-semibold ${scoreTone(t.computedProgress)}`}>
                        {t.computedProgress}% progress
                      </span>
                      <span className="text-[10px] text-gray-500">
                        Current {t.current.toLocaleString()} {t.unit} · Target {t.target.toLocaleString()} {t.unit}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{gapText(t)}</p>
                  </div>
                </div>
              );
                })}
        </div>
      </div>
    </div>
  );
}
