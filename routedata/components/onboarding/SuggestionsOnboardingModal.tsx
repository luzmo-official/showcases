'use client';

import React, { useState, useCallback } from 'react';
import type { FieldMetadata } from '@/lib/types';
import { useChartSuggestions, type ChartSuggestion } from '@/hooks/useChartSuggestions';
import { chartTypeLabel } from '@/components/insights/ChartSuggestionPreview';
import { ChartTypeIcon } from '@/components/charts/ChartTypeIcon';

const SESSION_DISMISS_KEY = 'routedata:suggestions-onboarding-dismissed';

export function isSuggestionsOnboardingDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  return sessionStorage.getItem(SESSION_DISMISS_KEY) === '1';
}

export function dismissSuggestionsOnboarding(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_DISMISS_KEY, '1');
}

interface SuggestionsOnboardingModalProps {
  open: boolean;
  onClose: () => void;
  datasetId: string;
  selectedFields: FieldMetadata[];
  embedReadyForDataset: boolean;
  onAddCharts: (charts: ChartSuggestion[]) => void;
}

export function SuggestionsOnboardingModal({
  open,
  onClose,
  datasetId,
  selectedFields,
  embedReadyForDataset,
  onAddCharts,
}: SuggestionsOnboardingModalProps) {
  const { charts, loading, error, refetch, hasFields } = useChartSuggestions(datasetId, selectedFields);
  const [selectedIdx, setSelectedIdx] = useState<Set<number>>(() => new Set());

  const toggleIdx = useCallback((idx: number) => {
    setSelectedIdx((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const handleSkip = useCallback(() => {
    dismissSuggestionsOnboarding();
    onClose();
  }, [onClose]);

  const handleAddSelected = useCallback(() => {
    const picked = Array.from(selectedIdx)
      .sort((a, b) => a - b)
      .map((i) => charts[i])
      .filter(Boolean);
    if (picked.length > 0) {
      onAddCharts(picked);
    }
    dismissSuggestionsOnboarding();
    onClose();
  }, [charts, onAddCharts, onClose, selectedIdx]);

  if (!open || !embedReadyForDataset || !hasFields) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="suggestions-onboarding-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 id="suggestions-onboarding-title" className="text-lg font-bold text-gray-900">
            Start with suggested charts
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Pick one or more charts built from your selected columns, or skip and build from scratch.
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 mb-3">
              <p className="text-sm text-red-700">{error}</p>
              <button type="button" onClick={() => refetch()} className="mt-2 text-sm font-medium text-red-800 underline">
                Retry
              </button>
            </div>
          )}

          {loading && charts.length === 0 && (
            <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          )}

          {!loading && charts.length === 0 && !error && (
            <p className="text-sm text-gray-500 py-6 text-center">No suggestions available for this selection.</p>
          )}

          {charts.length > 0 && (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {charts.map((chart, idx) => {
                const checked = selectedIdx.has(idx);
                return (
                  <li key={idx}>
                    <label
                      className={`relative flex cursor-pointer flex-col rounded-xl border p-3 transition-colors ${
                        checked
                          ? 'border-green-400 bg-green-50/40 ring-1 ring-green-200'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleIdx(idx)}
                        className="absolute left-3 top-3 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500/20"
                        aria-label={`Select ${chart.title}`}
                      />
                      <div className="flex flex-col items-center pt-7 text-center">
                        <div className="mb-2 flex h-16 w-full items-center justify-center rounded-lg bg-gray-50 text-green-600">
                          <ChartTypeIcon chartType={chart.chartType} className="h-11 w-11" />
                        </div>
                        <span className="text-[10px] font-medium tracking-wide text-gray-400 uppercase">
                          {chartTypeLabel(chart.chartType)}
                        </span>
                        <span className="mt-1 line-clamp-2 text-sm font-semibold text-gray-900">{chart.title}</span>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex flex-wrap items-center justify-end gap-2 shrink-0 bg-gray-50/80">
          <button
            type="button"
            onClick={handleSkip}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleAddSelected}
            disabled={selectedIdx.size === 0 || loading}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              selectedIdx.size === 0 || loading
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {selectedIdx.size === 0 ? 'Add selected' : `Add ${selectedIdx.size} chart${selectedIdx.size === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
