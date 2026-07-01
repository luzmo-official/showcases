'use client';

/**
 * Chart suggestions (deterministic + Luzmo aichart natural-language generation) with live
 * previews via `LuzmoVizItemComponent` from `@luzmo/react-embed` (one embed per suggestion).
 *
 * @see https://developer.luzmo.com/guide/flex--introduction--basic-usage.md
 */

import React, { useState, useCallback } from 'react';
import type { FieldMetadata } from '@/lib/types';
import { useChartSuggestions, type ChartSuggestion } from '@/hooks/useChartSuggestions';
import { ChartSuggestionPreview, chartTypeLabel } from '@/components/insights/ChartSuggestionPreview';
import { ChartTypeIcon } from '@/components/charts/ChartTypeIcon';
import { enrichSlotsWithFieldLabels } from '@/lib/luzmo/enrich-slot-labels';
import { LUZMO_API_HOST, LUZMO_EMBED_KEY, LUZMO_EMBED_TOKEN } from '@/lib/luzmo/config';

type SlotLike = { name?: string; content?: unknown[] };

const QUICK_SWITCH_TYPES = ['bar-chart', 'line-chart', 'area-chart', 'column-chart', 'donut-chart'] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function targetSlotOrderForType(chartType: string): string[] {
  switch (chartType) {
    case 'line-chart':
    case 'area-chart':
    case 'column-chart':
      return ['x-axis', 'measure', 'legend'];
    case 'bar-chart':
      return ['y-axis', 'measure', 'legend'];
    case 'donut-chart':
    case 'pie-chart':
      return ['category', 'measure', 'legend'];
    default:
      return ['measure', 'category', 'legend'];
  }
}

function remapSlotsForChartType(nextType: string, prevSlots: unknown[]): unknown[] {
  const prev = (prevSlots || []) as SlotLike[];
  const byName = new Map<string, SlotLike>();
  for (const s of prev) {
    if (typeof s?.name === 'string') byName.set(s.name, s);
  }

  const categorySlot = byName.get('category') || byName.get('x-axis') || byName.get('y-axis');
  const measureSlot = byName.get('measure');
  const legendSlot = byName.get('legend') || byName.get('group-by') || byName.get('color');
  const ySlot = byName.get('y-axis');
  const xSlot = byName.get('x-axis');
  const colorSlot = byName.get('color');

  const targetOrder = targetSlotOrderForType(nextType);
  const mapped: SlotLike[] = [];

  for (const target of targetOrder) {
    if (target === 'measure' && measureSlot?.content?.length) {
      mapped.push({ name: 'measure', content: measureSlot.content });
      continue;
    }
    if (target === 'x-axis') {
      const source = xSlot?.content?.length ? xSlot : categorySlot;
      if (source?.content?.length) mapped.push({ name: 'x-axis', content: source.content });
      continue;
    }
    if (target === 'y-axis') {
      const source = ySlot?.content?.length ? ySlot : categorySlot;
      if (source?.content?.length) mapped.push({ name: 'y-axis', content: source.content });
      continue;
    }
    if (target === 'category') {
      const source = categorySlot || xSlot || ySlot;
      if (source?.content?.length) mapped.push({ name: 'category', content: source.content });
      continue;
    }
    if (target === 'legend') {
      const source = legendSlot || colorSlot;
      if (source?.content?.length) mapped.push({ name: 'legend', content: source.content });
      continue;
    }
  }

  return mapped as unknown[];
}

interface SuggestedInsightsProps {
  datasetId: string;
  authKey: string;
  authToken: string;
  selectedFields: FieldMetadata[];
  onAddToWorkbook: (chart: { type: string; title: string; slots: unknown[]; options: Record<string, unknown> }) => void;
}

export default function SuggestedInsights({
  datasetId,
  authKey,
  authToken,
  selectedFields,
  onAddToWorkbook,
}: SuggestedInsightsProps) {
  const { charts, loading, error, refetch, hasFields } = useChartSuggestions(datasetId, selectedFields);
  const [addedSet, setAddedSet] = useState<Set<number>>(new Set());
  const [promptText, setPromptText] = useState('');
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [promptChart, setPromptChart] = useState<ChartSuggestion | null>(null);
  const [promptAdded, setPromptAdded] = useState(false);

  const handleAdd = useCallback(
    (chart: ChartSuggestion, idx: number) => {
      onAddToWorkbook({
        type: chart.chartType,
        title: chart.title,
        slots: chart.slots,
        options: chart.options,
      });
      setAddedSet((prev) => new Set(prev).add(idx));
    },
    [onAddToWorkbook]
  );

  const handleGenerateFromPrompt = useCallback(async () => {
    const question = promptText.trim();
    if (!question || !datasetId) return;
    setPromptLoading(true);
    setPromptError(null);
    setPromptAdded(false);
    try {
      const runAttempt = async (): Promise<ChartSuggestion> => {
        const res = await fetch(`${LUZMO_API_HOST}/0.1.0/aichart`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: LUZMO_EMBED_KEY,
            token: LUZMO_EMBED_TOKEN,
            version: '0.1.0',
            action: 'create',
            properties: {
              type: 'generate-chart',
              dataset_id: datasetId.trim(),
              question,
            },
          }),
        });
        if (!res.ok) {
          const e = new Error(`Luzmo aichart failed (${res.status})`) as Error & { status?: number };
          e.status = res.status;
          throw e;
        }
        const data = await res.json();
        const generated = data?.generatedChart as
          | { type?: string; title?: string | Record<string, string>; slots?: unknown[]; options?: Record<string, unknown> }
          | undefined;
        if (!generated?.type || !Array.isArray(generated.slots)) {
          throw new Error('AI response did not include a valid chart');
        }
        const title =
          typeof generated.title === 'string'
            ? generated.title
            : (generated.title?.en as string | undefined) ?? 'AI Generated Chart';
        return {
          title,
          chartType: generated.type,
          slots: enrichSlotsWithFieldLabels(generated.slots, selectedFields),
          options: generated.options ?? {},
        };
      };

      let generated: ChartSuggestion | null = null;
      try {
        generated = await runAttempt();
      } catch (firstErr) {
        const status = (firstErr as { status?: number }).status;
        const retryable = status === undefined || status >= 500 || status === 429;
        if (!retryable) throw firstErr;
        await sleep(350);
        generated = await runAttempt();
      }

      setPromptChart(generated);
    } catch (err) {
      setPromptError(err instanceof Error ? err.message : 'Failed to generate AI chart');
      setPromptChart(null);
    } finally {
      setPromptLoading(false);
    }
  }, [datasetId, promptText, selectedFields]);

  const handleAddPromptChart = useCallback(() => {
    if (!promptChart) return;
    onAddToWorkbook({
      type: promptChart.chartType,
      title: promptChart.title,
      slots: promptChart.slots,
      options: promptChart.options,
    });
    setPromptAdded(true);
  }, [onAddToWorkbook, promptChart]);

  const handlePromptChartTypeChange = useCallback((nextType: string) => {
    setPromptChart((prev) => {
      if (!prev) return prev;
      if (prev.chartType === nextType) return prev;
      return {
        ...prev,
        chartType: nextType,
        slots: remapSlotsForChartType(nextType, prev.slots),
      };
    });
    setPromptAdded(false);
  }, []);

  if (!hasFields) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4">
        <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <p className="text-xs text-gray-500 text-center max-w-[200px]">
          Select fields to get Luzmo Flex chart suggestions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 space-y-2">
        <p className="text-[11px] font-semibold text-blue-800 uppercase tracking-wide">AI Chart Prompt</p>
        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          rows={3}
          placeholder="Example: Compare weekly on-time delivery vs cost per shipment and highlight anomalies."
          className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] text-blue-700/90">Generate a chart from natural language, preview it, then add to dashboard.</p>
          <button
            type="button"
            onClick={() => void handleGenerateFromPrompt()}
            disabled={promptLoading || !promptText.trim()}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
              promptLoading || !promptText.trim()
                ? 'bg-blue-100 text-blue-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {promptLoading ? 'Generating...' : 'Generate'}
          </button>
        </div>
        {promptError && <p className="text-[11px] text-red-600">{promptError}</p>}
      </div>

      {promptChart && (
        <div className={`rounded-xl border overflow-hidden ${promptAdded ? 'border-blue-300 ring-1 ring-blue-200 bg-blue-50/40' : 'border-blue-200 bg-white'}`}>
          <div className="px-3 py-2 border-b border-blue-100 bg-blue-50/30">
            <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide mb-1.5">Quick Chart Type</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SWITCH_TYPES.map((type) => {
                const active = promptChart.chartType === type;
                const label = chartTypeLabel(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handlePromptChartTypeChange(type)}
                    aria-label={label}
                    title={label}
                    className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    <ChartTypeIcon chartType={type} className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="h-52 w-full bg-white border-b border-gray-100">
            <ChartSuggestionPreview
              chart={promptChart}
              authKey={authKey}
              authToken={authToken}
              previewIndex={-1}
              onPreviewClose={() => setPromptChart(null)}
            />
          </div>
          <div className="px-3 py-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleAddPromptChart}
              disabled={promptAdded}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                promptAdded ? 'bg-blue-100 text-blue-700 cursor-default' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
              }`}
            >
              {promptAdded ? '✓ Added' : 'Add to dashboard'}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <svg className="w-3.5 h-3.5 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        <span className="text-[11px] font-semibold text-sky-600 uppercase tracking-wide">
          {charts.length > 0 ? `${charts.length} Suggestions` : loading ? 'Loading...' : 'Suggestions'}
        </span>
        {loading && <div className="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />}
      </div>

      <p className="text-[10px] text-gray-400 leading-snug">
        AI Mode includes prompt-to-chart generation plus deterministic suggestions from selected columns.
      </p>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2.5">
          <p className="text-[11px] text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-1 text-[11px] text-red-700 font-medium underline"
          >
            Retry
          </button>
        </div>
      )}

      {loading && charts.length === 0 && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white overflow-hidden animate-pulse">
              <div className="h-32 bg-gray-50" />
              <div className="p-2.5">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {charts.length > 0 && (
        <div className="space-y-3">
          {charts.map((chart, idx) => {
            const isAdded = addedSet.has(idx);
            return (
              <div
                key={idx}
                className={`rounded-xl border overflow-hidden transition-all ${
                  isAdded ? 'border-green-300 bg-green-50/50 ring-1 ring-green-200' : 'border-gray-200 bg-white hover:border-sky-200'
                }`}
              >
                <div className="h-48 w-full bg-white border-b border-gray-100">
                  <ChartSuggestionPreview
                    chart={chart}
                    authKey={authKey}
                    authToken={authToken}
                    previewIndex={idx}
                    onPreviewClose={() => {}}
                  />
                </div>

                <div className="px-3 py-2 flex items-center justify-end gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAdd(chart, idx)}
                      disabled={isAdded}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                        isAdded ? 'bg-green-100 text-green-700 cursor-default' : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                      }`}
                    >
                      {isAdded ? '✓ Added' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
