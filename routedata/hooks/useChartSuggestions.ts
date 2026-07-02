'use client';

import { useMemo } from 'react';
import type { FieldMetadata } from '@/lib/types';
import { generateFlexSuggestions } from '@/lib/luzmo/chart-suggestions';

/** Deterministic chart generated from column selection alone — no network call, computed synchronously. */
export interface ChartSuggestion {
  title: string;
  chartType: string;
  slots: unknown[];
  options: Record<string, unknown>;
}

export function useChartSuggestions(datasetId: string, selectedFields: FieldMetadata[]) {
  const hasFields = selectedFields.length > 0;

  const charts = useMemo<ChartSuggestion[]>(() => {
    if (!datasetId.trim() || !hasFields) return [];
    return generateFlexSuggestions(selectedFields, datasetId.trim());
  }, [datasetId, hasFields, selectedFields]);

  return {
    charts,
    loading: false as const,
    error: null as string | null,
    refetch: () => {},
    hasFields,
  };
}
