'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { AppPage } from '@/components/nav/SideNav';
import type { PlatformData } from '@/hooks/usePlatformData';
import { APP_NAME, APP_SUBTITLE } from '@/lib/domain/routedata';
import { mergeShipbobFlexOptions } from '@/lib/luzmo/flex-chart-theme';
import { mergeFlexOptionsForStoredType, toFlexVizItemType } from '@/lib/luzmo/flex-viz-type';
import { StackLabelBadge } from '@/components/dev/StackLabelBadge';
import { getApiHost, getAppServer } from '@/lib/services/luzmo-service';
import { LUZMO_DASHBOARD_CONTENTS_VERSION } from '@/lib/luzmo-embed-constants';
import { makeFlexSlotContent, type DatasetColumn } from '@/lib/luzmo/chart-suggestions';
import { useDatasetInfo } from '@/hooks/useDatasetInfo';
import { KPI_COLUMN_IDS } from '@/lib/domain/kpi-columns';

interface HomePageProps {
  onNavigate: (page: AppPage) => void;
  connected: boolean;
  platformData: PlatformData | null;
  authKey: string;
  authToken: string;
  datasetId: string;
}

type FlexChartSpec = {
  title: string;
  subtitle: string;
  chartType: string;
  slots: unknown[];
  options?: Record<string, unknown>;
};

type RuntimeColumn = {
  id: string;
  name: string;
  type: string;
  subtype?: string | null;
  lowestLevel?: number;
  highestLevel?: number;
  hierarchy_enabled?: boolean;
};

const QUICK_ACTIONS = [
  { label: 'New Workbook', desc: 'Build a source table and assemble a RouteData workbook', page: 'reporting' as AppPage, icon: '🚚' },
  { label: 'View Workbooks', desc: 'Browse saved workbooks and dashboards', page: 'dashboards' as AppPage, icon: '📋' },
  { label: 'Action Items', desc: 'Review underperforming metrics and suggested actions', page: 'targets' as AppPage, icon: '🎯' },
  { label: 'Data Sources', desc: 'Manage shipment, carrier, route, and warehouse datasets', page: 'data-sources' as AppPage, icon: '🗄️' },
];

const FALLBACK_ACTION_FEED = [
  { name: 'Lane ETA Variance', metric: 'LA -> Dallas ETA drift above threshold', computedProgress: 62, current: 4.8, target: 2.5, unit: 'hr' },
  { name: 'Dock Queue Congestion', metric: 'Inbound queue spikes during 09:00-12:00', computedProgress: 71, current: 38, target: 25, unit: 'min' },
  { name: 'Carrier SLA Slippage', metric: 'Carrier SLA attainment below weekly baseline', computedProgress: 78, current: 87.4, target: 93, unit: '%' },
  { name: 'Exception Backlog', metric: 'Open delivery exceptions exceed watch threshold', computedProgress: 66, current: 142, target: 90, unit: 'cases' },
  { name: 'Warehouse Throughput Gap', metric: 'Processed volume below expected daily run-rate', computedProgress: 74, current: 910, target: 1200, unit: 'shipments/day' },
  { name: 'Last-Mile Cost Drift', metric: 'Cost per shipment increased in urban zones', computedProgress: 69, current: 212, target: 185, unit: 'USD' },
];

function measureContent(
  column: DatasetColumn,
  datasetId: string,
  aggregationFunc: 'sum' | 'average' | 'count' = 'average'
) {
  return {
    ...makeFlexSlotContent(column, datasetId),
    aggregationFunc,
  };
}

function normalizeCol(col: RuntimeColumn): DatasetColumn {
  return {
    id: col.id,
    name: { en: col.name || col.id },
    type: col.type,
    subtype: col.subtype || undefined,
    lowestLevel: col.lowestLevel,
    highestLevel: col.highestLevel,
    hierarchy_enabled: col.hierarchy_enabled,
  };
}

function pickDate(columns: RuntimeColumn[]): RuntimeColumn | null {
  const byId = columns.find((c) => c.id === KPI_COLUMN_IDS.date);
  if (byId) return byId;
  const preferred = columns.find((c) => c.type === 'datetime' && /date|time|day|week|month/i.test(c.name));
  return preferred ?? columns.find((c) => c.type === 'datetime') ?? null;
}

function findById(columns: RuntimeColumn[], id: string): RuntimeColumn | null {
  return columns.find((c) => c.id === id) ?? null;
}

function topKpiEvolutionSpecs(datasetId: string, runtimeColumns: RuntimeColumn[]): FlexChartSpec[] {
  if (!runtimeColumns.length) return [];
  const date = pickDate(runtimeColumns);
  const delay = findById(runtimeColumns, KPI_COLUMN_IDS.avgDeliveryDelay);
  const cost = findById(runtimeColumns, KPI_COLUMN_IDS.costPerShipment);
  if (!date || !delay || !cost) return [];

  const dateCol = normalizeCol(date);
  const delayCol = normalizeCol(delay);
  const costCol = normalizeCol(cost);

  return [
    {
      title: 'Total Deliveries',
      subtitle: 'Count with daily evolution',
      chartType: 'evolution-number',
      slots: [
        { name: 'evolution', content: [makeFlexSlotContent(dateCol, datasetId, 3)] },
        {
          name: 'measure',
          content: [
            { ...measureContent(dateCol, datasetId, 'count'), label: { en: 'Shipments' } },
          ],
        },
      ],
    },
    {
      title: 'Delivery Delay',
      subtitle: 'Number with evolution',
      chartType: 'evolution-number',
      slots: [
        { name: 'evolution', content: [makeFlexSlotContent(dateCol, datasetId, 3)] },
        { name: 'measure', content: [measureContent(delayCol, datasetId, 'average')] },
      ],
    },
    {
      title: 'Cost per Shipment',
      subtitle: 'Number with evolution',
      chartType: 'evolution-number',
      slots: [
        { name: 'evolution', content: [makeFlexSlotContent(dateCol, datasetId, 3)] },
        { name: 'measure', content: [measureContent(costCol, datasetId, 'average')] },
      ],
    },
  ];
}

function formatNumber(n: number, decimals = 1): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return n.toFixed(decimals);
}

function progressTone(progress: number) {
  if (progress >= 90) return 'bg-blue-900';
  if (progress >= 80) return 'bg-blue-700';
  if (progress >= 70) return 'bg-blue-500';
  return 'bg-blue-300';
}

function scoreTone(score: number) {
  if (score >= 90) return 'text-blue-900';
  if (score >= 80) return 'text-blue-700';
  if (score >= 70) return 'text-blue-600';
  return 'text-blue-400';
}

function isLowerBetter(targetName: string): boolean {
  return targetName.toLowerCase().includes('delay');
}

function progressPercent(current: number, target: number, lowerBetter: boolean): number {
  if (lowerBetter) {
    if (current <= 0) return 100;
    return Math.max(0, Math.min(100, Math.round((target / current) * 100)));
  }
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

function ShimmerCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
      <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
      <div className="h-6 w-20 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-16 bg-gray-100 rounded" />
    </div>
  );
}

function FlexKpiChart({
  spec,
  authKey,
  authToken,
  compact = false,
}: {
  spec: FlexChartSpec;
  authKey: string;
  authToken: string;
  compact?: boolean;
}) {
  const [LuzmoViz, setLuzmoViz] = useState<React.ComponentType<Record<string, unknown>> | null>(null);

  useEffect(() => {
    import('@luzmo/react-embed')
      .then((mod) => setLuzmoViz(() => mod.LuzmoVizItemComponent))
      .catch(() => setLuzmoViz(null));
  }, []);

  const options = useMemo(
    () =>
      mergeShipbobFlexOptions(
        mergeFlexOptionsForStoredType(spec.chartType, (spec.options ?? {}) as Record<string, unknown>),
        {
          mode: 'preview',
        }
      ),
    [spec.chartType, spec.options]
  );

  return (
    <div className="bg-white rounded-2xl border border-blue-100 p-3">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-slate-900">{spec.title}</h3>
        <p className="text-[11px] text-slate-500">{spec.subtitle}</p>
      </div>
      <StackLabelBadge
        className={`${compact ? 'h-36' : 'h-56'} rounded-xl border border-blue-50 bg-white overflow-hidden`}
        label="LuzmoVizItemComponent"
        description="Home KPI strip: embedded Flex item for the headline metric on the landing page."
        title="@luzmo/react-embed — HomePage KPI embed"
        variant="flex"
      >
        {!authKey || !authToken || !LuzmoViz ? (
          <div className="h-full flex items-center justify-center text-[11px] text-slate-500 bg-blue-50/40">
            Waiting for authentication...
          </div>
        ) : (
          <LuzmoViz
            key={`${spec.chartType}-${spec.title}`}
            appServer={getAppServer()}
            apiHost={getApiHost()}
            authKey={authKey}
            authToken={authToken}
            type={toFlexVizItemType(spec.chartType)}
            options={options}
            slots={spec.slots}
            itemDimensions={{ width: 12, height: 6 }}
            language="en"
            screenMode="auto"
            contextId={`home-${spec.chartType}-${spec.title.replace(/\s+/g, '-').toLowerCase()}`}
            dashboardContentsVersion={LUZMO_DASHBOARD_CONTENTS_VERSION}
          />
        )}
      </StackLabelBadge>
    </div>
  );
}

export default function HomePage({
  onNavigate,
  connected,
  platformData,
  authKey,
  authToken,
  datasetId,
}: HomePageProps) {
  const { dataset } = useDatasetInfo();
  const runtimeColumns = useMemo<RuntimeColumn[]>(
    () =>
      dataset?.columns.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        subtype: c.subtype,
      })) ?? [],
    [dataset]
  );
  const targets = platformData?.targets ?? [];
  const targetRows = targets.map((t) => {
    const lowerBetter = isLowerBetter(t.name);
    const computed = progressPercent(t.current, t.target, lowerBetter);
    return {
      ...t,
      computedProgress: Number.isFinite(t.progress) ? t.progress : computed,
    };
  });
  const topKpiCharts = useMemo(() => topKpiEvolutionSpecs(datasetId, runtimeColumns), [datasetId, runtimeColumns]);
  const actionFeedRows = targetRows.length > 0 ? targetRows : FALLBACK_ACTION_FEED;

  return (
    <div className="flex-1 overflow-auto">
      <div className="w-[90%] max-w-full mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-white px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-sm shrink-0">
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M4 16l4-4 3 3 6-7 3 3" />
                  <path d="M4 20h16" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{APP_NAME}</h1>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 mt-0.5">Supply chain analytics workspace</p>
              </div>
            </div>
            <div className="min-w-[260px]">
              <p className="text-sm text-slate-600 mt-1">{APP_SUBTITLE}</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs">
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-blue-600' : 'bg-amber-500'}`} />
              <span className="font-semibold text-slate-700">{connected ? 'Live data connected' : 'Connection degraded'}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topKpiCharts.length === 0
              ? Array.from({ length: 3 }).map((_, i) => <ShimmerCard key={`top-shimmer-${i}`} />)
              : topKpiCharts.map((spec) => (
                  <FlexKpiChart
                    key={`top-${spec.title}`}
                    spec={spec}
                    authKey={authKey}
                    authToken={authToken}
                    compact
                  />
                ))}
          </div>
        </div>

        <div className="mb-6">
          <div className="bg-white rounded-2xl border border-blue-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900">Action Feed</h2>
              <button
                type="button"
                onClick={() => onNavigate('targets')}
                className="text-[11px] font-semibold text-blue-700 hover:text-blue-800"
              >
                Open Action Items
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {actionFeedRows.slice(0, 6).map((target) => (
                <button
                  key={target.name}
                  type="button"
                  onClick={() => onNavigate('targets')}
                  className="rounded-xl border border-blue-100 p-3 bg-blue-50/30 min-h-[106px] text-left hover:border-blue-300 hover:bg-blue-50/60 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{target.name}</p>
                      <p className="text-[11px] text-slate-500">{target.metric}</p>
                    </div>
                    <span className={`text-xs font-bold ${scoreTone(target.computedProgress)}`}>{target.computedProgress}%</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                    <div className={`h-full ${progressTone(target.computedProgress)}`} style={{ width: `${Math.max(3, target.computedProgress)}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Current: {formatNumber(target.current)}{target.unit} | Target: {formatNumber(target.target)}{target.unit}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <h2 className="text-sm font-bold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => onNavigate(action.page)}
              className="flex items-start gap-3 p-4 bg-white rounded-xl border border-blue-100 text-left hover:border-blue-300 hover:bg-blue-50/40 transition-all group"
            >
              <span className="text-2xl">{action.icon}</span>
              <div>
                <h3 className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">{action.label}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{action.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
