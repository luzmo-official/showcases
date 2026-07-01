'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { LuzmoEmbedVizItem } from '@luzmo/embed';
import AckDashboardGrid from '@/components/ack/AckDashboardGrid';
import { ChartConfigPanel } from '@/components/ack/ChartConfigPanel';
import { EditItemPanel } from '@/components/ack/EditItemPanel';
import { FiltersPanel } from '@/components/ack/FiltersPanel';
import SuggestedInsights from '@/components/insights/SuggestedInsights';
import {
  SuggestionsOnboardingModal,
  isSuggestionsOnboardingDismissed,
} from '@/components/onboarding/SuggestionsOnboardingModal';
import type { ChartSuggestion } from '@/hooks/useChartSuggestions';
import type { CanvasItemDefinition, FieldMetadata, Sort } from '@/lib/types';
import { FIELD_GROUPS, FILTER_EXAMPLES } from '@/lib/domain/routedata';
import { getApiHost, getAppServer } from '@/lib/services/luzmo-service';
import { LUZMO_DASHBOARD_CONTENTS_VERSION } from '@/lib/luzmo-embed-constants';
import { mergeShipbobFlexOptions } from '@/lib/luzmo/flex-chart-theme';
import {
  FLEX_CHART_TYPES,
  chartUsesColorByCategory,
  flexChartTypeLabel,
} from '@/lib/luzmo/flex-chart-types';
import { slotsForChartTypeChange } from '@/lib/luzmo/flex-slot-contents';
import { mergeFlexOptionsForStoredType, toFlexVizItemType } from '@/lib/luzmo/flex-viz-type';
import { enrichSlotsWithFieldLabels } from '@/lib/luzmo/enrich-slot-labels';
import { ChartTypeIcon } from '@/components/charts/ChartTypeIcon';
import { FlexChartChrome } from '@/components/charts/FlexChartChrome';
import { StackLabelBadge } from '@/components/dev/StackLabelBadge';

type RightPanelTab = 'chart-config' | 'filters' | 'chart-options' | 'suggestions';

function withChartTypeDefaults(chartType: string, options: Record<string, unknown>): Record<string, unknown> {
  const next = { ...(options || {}) };
  if (chartUsesColorByCategory(chartType)) {
    next.categories = {
      ...((next.categories as Record<string, unknown>) ?? {}),
      // ACK/Luzmo option key for "color by category"
      colored: true,
    };
  }
  return next;
}

function withPreviewColorByCategory(chartType: string, options: Record<string, unknown>): Record<string, unknown> {
  if (!chartUsesColorByCategory(chartType)) return options;
  return {
    ...options,
    categories: {
      ...((options.categories as Record<string, unknown>) ?? {}),
      colored: true,
    },
  };
}

interface StepDashboardBuilderProps {
  authKey: string;
  authToken: string;
  datasetId: string;
  datasetName: string;
  /** False while embed token is for a different dataset than `datasetId` (prevents Flex infinite load). */
  embedReadyForDataset: boolean;
  /** Luzmo may return a warning when API user cannot fully grant requested dataset access. */
  embedWarning?: string;
  /** Forces `luzmo-item-grid` remount when embed scope changes. */
  embedKey: string;
  selectedFields: FieldMetadata[];
  canvasItems: CanvasItemDefinition[];
  filters: unknown[];
  sorts: Sort[];
  onAddCanvasItem: (item: Omit<CanvasItemDefinition, 'id' | 'position'>) => void;
  onAddCanvasItemsBatch: (
    items: Array<Omit<CanvasItemDefinition, 'id' | 'position'>>,
    layout: { sizeX: number; sizeY: number }
  ) => void;
  onRemoveCanvasItem: (id: string) => void;
  onUpdateCanvasItem: (id: string, update: Partial<CanvasItemDefinition>) => void;
  onSetFilters: (filters: unknown[]) => void;
  onLayoutChange: (items: CanvasItemDefinition[]) => void;
  onDatasetChanged: (id: string) => void;
  onBack: () => void;
}

function BuilderChartPreview({
  authKey,
  authToken,
  chartType,
  slots,
  options,
  title,
  onTitleChange,
}: {
  authKey: string;
  authToken: string;
  chartType: string;
  slots: unknown[];
  options: Record<string, unknown>;
  title: string;
  onTitleChange?: (t: string) => void;
}) {
  const [LuzmoViz, setLuzmoViz] = useState<React.ComponentType<Record<string, unknown>> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const vizRef = useRef<LuzmoEmbedVizItem | null>(null);

  useEffect(() => {
    import('@luzmo/react-embed')
      .then((mod) => setLuzmoViz(() => mod.LuzmoVizItemComponent))
      .catch(() => setLoadError(true));
  }, []);

  const themedOptions = useMemo(
    () => {
      const previewDefaults = withPreviewColorByCategory(chartType, options);
      const withPie = mergeFlexOptionsForStoredType(chartType, previewDefaults);
      return mergeShipbobFlexOptions(withPie, { mode: 'preview' });
    },
    [chartType, options]
  );

  const flexType = toFlexVizItemType(chartType);

  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center text-[11px] text-red-600">
        Preview failed to load.
      </div>
    );
  }

  const hasAnySlotContent =
    Array.isArray(slots) &&
    slots.some((s) => {
      const row = s as { content?: unknown[] };
      return Array.isArray(row?.content) && row.content.length > 0;
    });
  if (!hasAnySlotContent) {
    return (
      <div className="h-full flex items-center justify-center text-[11px] text-gray-400 px-4 text-center">
        Add fields to chart slots to see a live preview.
      </div>
    );
  }

  if (!LuzmoViz) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <StackLabelBadge
      className="h-full min-h-0"
      label="LuzmoVizItemComponent (builder preview)"
      description="WYSIWYG preview while you configure charts—mirrors the Flex tile you’ll get on the canvas."
      title="@luzmo/react-embed — StepDashboardBuilder live preview"
      variant="flex"
    >
      <FlexChartChrome chartType={chartType} title={title} vizRef={vizRef} onTitleChange={onTitleChange} className="h-full">
        <LuzmoViz
          ref={(node: unknown) => {
            vizRef.current = node as LuzmoEmbedVizItem | null;
          }}
          key={`builder-preview-${flexType}-${authKey}`}
          appServer={getAppServer()}
          apiHost={getApiHost()}
          authKey={authKey}
          authToken={authToken}
          type={flexType}
          options={themedOptions}
          slots={slots}
          contextId={`builder-preview-${flexType}`}
          dashboardContentsVersion={LUZMO_DASHBOARD_CONTENTS_VERSION}
          style={{ width: '100%', height: '100%' }}
        />
      </FlexChartChrome>
    </StackLabelBadge>
  );
}

export default function StepDashboardBuilder({
  authKey,
  authToken,
  datasetId,
  datasetName,
  embedReadyForDataset,
  embedWarning,
  embedKey,
  selectedFields,
  canvasItems,
  filters,
  sorts: _sorts,
  onAddCanvasItem,
  onAddCanvasItemsBatch,
  onRemoveCanvasItem,
  onUpdateCanvasItem,
  onSetFilters,
  onLayoutChange,
  onDatasetChanged,
  onBack,
}: StepDashboardBuilderProps) {
  void _sorts;
  const [rightTab, setRightTab] = useState<RightPanelTab>('chart-config');
  const [editingItem, setEditingItem] = useState<CanvasItemDefinition | null>(null);
  /** When set, Chart Data applies to this canvas item; when null, "Add" creates a new one. */
  const [builderTargetId, setBuilderTargetId] = useState<string | null>(null);
  const [chartBuilderType, setChartBuilderType] = useState('bar-chart');
  const [chartBuilderTitle, setChartBuilderTitle] = useState('');
  const [chartBuilderSlots, setChartBuilderSlots] = useState<unknown[]>(() => slotsForChartTypeChange('bar-chart', []));
  const [chartBuilderOptions, setChartBuilderOptions] = useState<Record<string, unknown>>({});
  // Legacy/default layout state preserved (both side panels open) for easy rollback.
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [showSuggestionsOnboarding, setShowSuggestionsOnboarding] = useState(false);

  /**
   * Legacy behavior (saved for easy rollback):
   * when chart type changed, we reset slots/options to [] / {}.
   */
  const legacyResetOnTypeChange = useCallback(() => {
    setChartBuilderSlots([]);
    setChartBuilderOptions({});
  }, []);
  void legacyResetOnTypeChange;

  const resetChartBuilder = useCallback(() => {
    setBuilderTargetId(null);
    setEditingItem(null);
    setChartBuilderType('bar-chart');
    setChartBuilderTitle('');
    setChartBuilderSlots(slotsForChartTypeChange('bar-chart', []));
    setChartBuilderOptions({});
  }, []);

  const handleGridEditData = useCallback((item: CanvasItemDefinition) => {
    setEditingItem(item);
    setBuilderTargetId(item.id);
    setChartBuilderType(item.type);
    setChartBuilderTitle(item.title || '');
    setChartBuilderSlots(
      enrichSlotsWithFieldLabels(slotsForChartTypeChange(item.type, item.slots ?? []), selectedFields)
    );
    setChartBuilderOptions(item.options);
    setRightTab('chart-config');
  }, [selectedFields]);

  const handleGridEditOptions = useCallback((item: CanvasItemDefinition) => {
    setEditingItem(item);
    setBuilderTargetId(item.id);
    setChartBuilderType(item.type);
    setChartBuilderTitle(item.title || '');
    setChartBuilderSlots(
      enrichSlotsWithFieldLabels(slotsForChartTypeChange(item.type, item.slots ?? []), selectedFields)
    );
    setChartBuilderOptions(item.options);
    setRightTab('chart-options');
  }, [selectedFields]);

  const handleEditingItemTypeChange = useCallback(
    (nextType: string) => {
      if (!editingItem) return;
      const currentSlots = (editingItem.slots ?? []) as unknown[];
      const remappedSlots = slotsForChartTypeChange(nextType, currentSlots);
      const enriched = enrichSlotsWithFieldLabels(remappedSlots, selectedFields);
      onUpdateCanvasItem(editingItem.id, {
        type: nextType,
        slots: enriched as CanvasItemDefinition['slots'],
      });
      setEditingItem((prev) =>
        prev ? { ...prev, type: nextType, slots: enriched as CanvasItemDefinition['slots'] } : prev
      );
      setChartBuilderType(nextType);
      setChartBuilderSlots(enriched);
      setChartBuilderOptions((prev) => withChartTypeDefaults(nextType, prev));
    },
    [editingItem, onUpdateCanvasItem, selectedFields]
  );

  const handleRemoveFromGrid = useCallback(
    (id: string) => {
      onRemoveCanvasItem(id);
      setEditingItem((prev) => (prev?.id === id ? null : prev));
      setBuilderTargetId((prev) => (prev === id ? null : prev));
    },
    [onRemoveCanvasItem]
  );

  const handleDuplicateFromGrid = useCallback(
    (item: CanvasItemDefinition) => {
      const base = item.title?.trim() || 'Chart';
      onAddCanvasItem({
        type: item.type,
        title: `${base} (copy)`,
        options: { ...(item.options ?? {}) },
        slots: enrichSlotsWithFieldLabels(item.slots as unknown[], selectedFields) as CanvasItemDefinition['slots'],
        filters: item.filters,
      });
    },
    [onAddCanvasItem, selectedFields]
  );

  const handleApplyChart = useCallback(() => {
    const titleForChart =
      chartBuilderTitle.trim() ||
      chartBuilderType.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const resolvedOptions = withChartTypeDefaults(chartBuilderType, chartBuilderOptions);
    const slotsToSave = enrichSlotsWithFieldLabels(
      chartBuilderSlots,
      selectedFields
    ) as CanvasItemDefinition['slots'];
    if (builderTargetId) {
      onUpdateCanvasItem(builderTargetId, {
        type: chartBuilderType,
        title: titleForChart,
        slots: slotsToSave,
        options: resolvedOptions,
      });
      setEditingItem((prev) =>
        prev?.id === builderTargetId
          ? {
              ...prev,
              type: chartBuilderType,
              title: titleForChart,
              slots: slotsToSave,
              options: resolvedOptions,
            }
          : prev
      );
    } else {
      onAddCanvasItem({
        type: chartBuilderType,
        title: titleForChart,
        options: resolvedOptions,
        slots: slotsToSave,
      });
    }
  }, [
    builderTargetId,
    chartBuilderType,
    chartBuilderTitle,
    chartBuilderOptions,
    chartBuilderSlots,
    onAddCanvasItem,
    onUpdateCanvasItem,
    selectedFields,
  ]);

  const handleAIChartAdd = useCallback(
    (chart: { type: string; title: string; slots: unknown[]; options: Record<string, unknown> }) => {
      const resolvedOptions = withChartTypeDefaults(chart.type, chart.options);
      const slots = enrichSlotsWithFieldLabels(chart.slots, selectedFields) as CanvasItemDefinition['slots'];
      onAddCanvasItem({
        type: chart.type,
        title: chart.title,
        options: resolvedOptions,
        slots,
      });
    },
    [onAddCanvasItem, selectedFields]
  );

  const handleOnboardingAddCharts = useCallback(
    (charts: ChartSuggestion[]) => {
      const items = charts.map((chart) => {
        const resolvedOptions = withChartTypeDefaults(chart.chartType, chart.options);
        const slots = enrichSlotsWithFieldLabels(chart.slots, selectedFields) as CanvasItemDefinition['slots'];
        return {
          type: chart.chartType,
          title: chart.title,
          options: resolvedOptions,
          slots,
        };
      });
      /** Grid units; must match `luzmo-item-grid` column count (48) — two 24-wide tiles per row. */
      onAddCanvasItemsBatch(items, { sizeX: 24, sizeY: 24 });
    },
    [onAddCanvasItemsBatch, selectedFields]
  );

  // Auto-open the onboarding once the embed is ready and there is a fresh, empty canvas.
  useEffect(() => {
    if (!embedReadyForDataset) return;
    if (canvasItems.length > 0) return;
    if (selectedFields.length === 0) return;
    if (isSuggestionsOnboardingDismissed()) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to async embed readiness
    setShowSuggestionsOnboarding(true);
  }, [embedReadyForDataset, canvasItems.length, selectedFields.length]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dismiss onboarding once the user has added a chart
    if (canvasItems.length > 0) setShowSuggestionsOnboarding(false);
  }, [canvasItems.length]);

  const RIGHT_TABS: { key: RightPanelTab; label: string }[] = [
    { key: 'chart-config', label: 'Chart Data' },
    { key: 'filters', label: 'Filters' },
    { key: 'chart-options', label: 'Options' },
    { key: 'suggestions', label: 'AI Mode' },
  ];

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden flex-col">
      <SuggestionsOnboardingModal
        open={showSuggestionsOnboarding}
        onClose={() => setShowSuggestionsOnboarding(false)}
        datasetId={datasetId}
        selectedFields={selectedFields}
        embedReadyForDataset={embedReadyForDataset}
        onAddCharts={handleOnboardingAddCharts}
      />
      {embedWarning?.trim() && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[11px] text-amber-950">
          <span className="font-semibold">Luzmo embed warning:</span> {embedWarning}
        </div>
      )}
      {!embedReadyForDataset && authKey && authToken && datasetId && (
        <div className="shrink-0 border-b border-sky-200 bg-sky-50 px-4 py-2 text-[11px] text-sky-950 flex items-center gap-2">
          <div className="h-3.5 w-3.5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin shrink-0" />
          <span>
            Syncing Luzmo embed access with the selected dataset… Charts load after the token matches this dataset.
          </span>
        </div>
      )}
      <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Center: ACK grid + top bar */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-200 bg-white flex items-center gap-3 flex-shrink-0">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-green-600 transition-colors flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Edit data
          </button>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 min-w-0">
            {selectedFields.slice(0, 6).map((f) => (
              <span
                key={f.id}
                className="inline-block px-2 py-0.5 rounded-full bg-green-50 text-[10px] text-green-700 font-medium whitespace-nowrap"
              >
                {f.name?.en || f.id}
              </span>
            ))}
            {selectedFields.length > 6 && (
              <span className="text-[10px] text-gray-400 whitespace-nowrap">+{selectedFields.length - 6}</span>
            )}
          </div>
          <div className="ml-auto flex-shrink-0">
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {canvasItems.length} chart{canvasItems.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <section className="flex min-h-0 flex-1 flex-col overflow-auto p-4">
          <AckDashboardGrid
            authKey={authKey}
            authToken={authToken}
            embedKey={embedKey}
            canvasItems={canvasItems}
            globalFilters={filters}
            onLayoutSync={onLayoutChange}
            onEditData={handleGridEditData}
            onEditOptions={handleGridEditOptions}
            onRemoveItem={handleRemoveFromGrid}
            onDuplicateItem={handleDuplicateFromGrid}
            disabled={!embedReadyForDataset}
          />
        </section>
      </div>

      {/* Right rail */}
      {rightPanelCollapsed && (
        <aside className="w-8 shrink-0 border-l border-gray-200 bg-white flex items-start justify-center pt-3">
          <button
            type="button"
            onClick={() => setRightPanelCollapsed(false)}
            className="h-6 w-6 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 flex items-center justify-center"
            title="Expand builder panel"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 5l-7 7 7 7" />
            </svg>
          </button>
        </aside>
      )}
      {!rightPanelCollapsed && (
      <aside className="w-[22rem] shrink-0 border-l border-gray-200 bg-white flex flex-col min-h-0">
        <div className="flex border-b border-gray-200 flex-shrink-0 overflow-x-auto">
          {RIGHT_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setRightTab(tab.key)}
              className={`flex-1 min-w-0 px-2 py-2.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                rightTab === tab.key
                  ? 'text-green-700 border-b-2 border-green-500 bg-green-50/50'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setRightPanelCollapsed(true)}
            className="px-2 py-2.5 text-gray-500 hover:text-gray-700 border-l border-gray-200 flex items-center justify-center"
            title="Collapse builder panel"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 min-h-0">
          {rightTab === 'chart-config' && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-gray-500 flex-1">
                  {builderTargetId
                    ? `Editing chart on the grid. Adjust slots, then update.`
                    : `Configure a logistics chart, then add it to the grid.`}
                </p>
                <button
                  type="button"
                  onClick={resetChartBuilder}
                  className="text-[10px] font-semibold text-gray-500 hover:text-green-700 shrink-0"
                >
                  New chart
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Chart type
                </label>
                <div className="grid grid-cols-6 gap-2 max-h-[5rem] overflow-y-auto overflow-x-hidden pr-0.5 [scrollbar-gutter:stable]">
                  {FLEX_CHART_TYPES.map((ct) => {
                    const active = chartBuilderType === ct;
                    return (
                      <button
                        key={ct}
                        type="button"
                        onClick={() => {
                          setChartBuilderType(ct);
                          if (!chartBuilderTitle.trim() || chartBuilderTitle === flexChartTypeLabel(chartBuilderType)) {
                            setChartBuilderTitle('');
                          }
                          setChartBuilderSlots((prev) => slotsForChartTypeChange(ct, prev));
                          setChartBuilderOptions((prev) => withChartTypeDefaults(ct, prev));
                        }}
                        aria-label={flexChartTypeLabel(ct)}
                        title={flexChartTypeLabel(ct)}
                        className={`h-9 rounded-lg border flex items-center justify-center transition-colors ${
                          active
                            ? 'bg-green-50 border-green-300 text-green-700'
                            : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <ChartTypeIcon chartType={ct} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Chart title
                </label>
                <input
                  type="text"
                  value={chartBuilderTitle}
                  onChange={(e) => setChartBuilderTitle(e.target.value)}
                  placeholder={flexChartTypeLabel(chartBuilderType)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
                />
              </div>

              <p className="text-[10px] text-gray-400 mt-2">
                Open each slot below to choose a field from your dataset (columns from the data step).
              </p>

              {embedReadyForDataset ? (
                <div className="chart-config-panel-luzmo rounded-xl bg-white p-4 shadow-sm">
                  <ChartConfigPanel
                    authKey={authKey}
                    authToken={authToken}
                    datasetId={datasetId}
                    itemType={toFlexVizItemType(chartBuilderType)}
                    slotsContents={chartBuilderSlots}
                    onSlotsContentsChanged={(slots) =>
                      setChartBuilderSlots(enrichSlotsWithFieldLabels(slots, selectedFields))
                    }
                    mode="picker"
                    restrictToFields={selectedFields}
                    datasetName={datasetName}
                    onDatasetChanged={onDatasetChanged}
                  />
                  <div className="mt-6">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Live preview
                    </p>
                    <div className="min-h-[280px] h-[min(40vh,320px)] rounded-lg overflow-hidden bg-gray-50/60">
                      <BuilderChartPreview
                        authKey={authKey}
                        authToken={authToken}
                        chartType={chartBuilderType}
                        slots={chartBuilderSlots}
                        options={chartBuilderOptions}
                        title={chartBuilderTitle.trim() || flexChartTypeLabel(chartBuilderType)}
                        onTitleChange={setChartBuilderTitle}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-sky-900/90 rounded-lg border border-sky-200 bg-sky-50/80 p-3">
                  Chart Data slots load after the Luzmo embed token is minted for this dataset (see banner above).
                </p>
              )}

              <button
                type="button"
                onClick={handleApplyChart}
                disabled={!embedReadyForDataset}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-medium rounded-lg shadow-sm transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {builderTargetId ? 'Update chart' : 'Add to dashboard'}
              </button>
            </div>
          )}

          {rightTab === 'filters' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                <code className="text-[10px]">luzmo-filters</code> — logistics examples: {FILTER_EXAMPLES.slice(0, 3).join(' · ')}.
              </p>
              {embedReadyForDataset ? (
                <FiltersPanel
                  authKey={authKey}
                  authToken={authToken}
                  datasetId={datasetId}
                  filters={filters}
                  availableFields={selectedFields}
                  onFiltersChanged={onSetFilters}
                />
              ) : (
                <p className="text-xs text-sky-900/90 rounded-lg border border-sky-200 bg-sky-50/80 p-3">
                  Filters load after the embed token matches this dataset.
                </p>
              )}
            </div>
          )}

          {rightTab === 'chart-options' && (
            <div className="space-y-3">
              {editingItem && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Chart Type
                  </label>
                  <div className="grid grid-cols-6 gap-2 max-h-[5rem] overflow-y-auto overflow-x-hidden pr-0.5 [scrollbar-gutter:stable]">
                    {FLEX_CHART_TYPES.map((ct) => {
                      const active = editingItem.type === ct;
                      return (
                        <button
                          key={ct}
                          type="button"
                          onClick={() => handleEditingItemTypeChange(ct)}
                          aria-label={flexChartTypeLabel(ct)}
                          title={flexChartTypeLabel(ct)}
                          className={`h-9 rounded-lg border flex items-center justify-center transition-colors ${
                            active
                              ? 'bg-green-50 border-green-300 text-green-700'
                              : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <ChartTypeIcon chartType={ct} />
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    Switch chart type directly from the grid item editor (bar, line, area, donut, etc.).
                  </p>
                </div>
              )}
              <p className="text-xs text-gray-500">
                {editingItem
                  ? `Options for "${editingItem.title}"`
                  : 'Use “Edit options” on a grid item, or pick a chart from the grid.'}
              </p>
              {editingItem && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Chart title
                  </label>
                  <input
                    type="text"
                    value={chartBuilderTitle}
                    onChange={(e) => {
                      setChartBuilderTitle(e.target.value);
                    }}
                    onBlur={() => {
                      if (editingItem) {
                        const t = chartBuilderTitle.trim() || flexChartTypeLabel(editingItem.type);
                        onUpdateCanvasItem(editingItem.id, { title: t });
                        setEditingItem({ ...editingItem, title: t });
                      }
                    }}
                    placeholder={flexChartTypeLabel(editingItem.type)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-colors"
                  />
                </div>
              )}
              {editingItem?.type === 'data-chart' ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 text-[11px] text-gray-600 leading-relaxed">
                  <p className="font-medium text-gray-800 mb-1">Legacy data chart</p>
                  <p>Not configured through ACK. Remove and rebuild as a Flex chart if needed.</p>
                </div>
              ) : embedReadyForDataset ? (
                <EditItemPanel
                  authKey={authKey}
                  authToken={authToken}
                  itemType={toFlexVizItemType(editingItem?.type || chartBuilderType)}
                  options={editingItem?.options || chartBuilderOptions}
                  slots={editingItem?.slots || (chartBuilderSlots as unknown[])}
                  onOptionsChanged={(opts) => {
                    if (editingItem) {
                      onUpdateCanvasItem(editingItem.id, { options: opts });
                      setEditingItem({ ...editingItem, options: opts });
                    } else {
                      setChartBuilderOptions(opts);
                    }
                  }}
                />
              ) : (
                <p className="text-xs text-sky-900/90 rounded-lg border border-sky-200 bg-sky-50/80 p-3">
                  Options load after the embed token matches this dataset.
                </p>
              )}
            </div>
          )}

          {rightTab === 'suggestions' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Quick logistics layouts from selected fields ({FIELD_GROUPS.join(', ')}). Optional, you can still build manually.
              </p>
              {authKey && authToken ? (
                <SuggestedInsights
                  datasetId={datasetId}
                  authKey={authKey}
                  authToken={authToken}
                  selectedFields={selectedFields}
                  onAddToWorkbook={handleAIChartAdd}
                />
              ) : (
                <p className="text-xs text-gray-400">Waiting for embed auth…</p>
              )}
            </div>
          )}
        </div>
      </aside>
      )}
      </div>
    </div>
  );
}
