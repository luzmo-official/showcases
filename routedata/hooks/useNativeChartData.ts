'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { NativeChartSpec } from '@/lib/types';
import { getApiHost } from '@/lib/services/luzmo-service';
import { dimensionFromSpec, measureSum } from '@/lib/charts/luzmo-query';

export interface NativeChartPoint {
  label: string;
  value: number;
}

function cellLabel(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object' && v !== null && 'en' in v && typeof (v as { en: unknown }).en === 'string') {
    return (v as { en: string }).en;
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function toNumber(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

const ROW_CAP = 500;

export function useNativeChartData(
  authKey: string,
  authToken: string,
  spec: NativeChartSpec | null
): {
  points: NativeChartPoint[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [points, setPoints] = useState<NativeChartPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!spec || !authKey || !authToken || !spec.datasetId) {
      setPoints([]);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const dim = dimensionFromSpec(
        spec.datasetId,
        spec.dimensionFieldId,
        spec.dimensionType,
        spec.dimensionLowestLevel
      );
      const meas = measureSum(spec.measureFieldId, spec.datasetId);

      const body = {
        key: authKey,
        token: authToken,
        version: '0.1.0',
        action: 'get',
        find: {
          queries: [
            {
              dimensions: [dim],
              measures: [meas],
              limit: { by: ROW_CAP, offset: 0 },
            },
          ],
        },
      };

      const res = await fetch(`${getApiHost()}/0.1.0/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Luzmo data API ${res.status}: ${text.slice(0, 400)}`);
      }

      const json = await res.json();
      let resultRows: unknown[][] = [];
      if (Array.isArray(json.data)) {
        if (json.data.length > 0 && Array.isArray(json.data[0]?.data)) {
          resultRows = json.data[0].data;
        } else if (json.data.length > 0 && Array.isArray(json.data[0])) {
          resultRows = json.data;
        }
      }

      const next: NativeChartPoint[] = [];
      for (const row of resultRows) {
        if (!Array.isArray(row) || row.length < 2) continue;
        next.push({
          label: cellLabel(row[0]) || '—',
          value: toNumber(row[row.length - 1]),
        });
      }

      if (spec.kind === 'bar') {
        next.sort((a, b) => b.value - a.value);
      }

      if (!controller.signal.aborted) {
        setPoints(next);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('useNativeChartData:', err);
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Query failed');
        setPoints([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [authKey, authToken, spec]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off async data fetch on spec/auth change
    void fetchData();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchData]);

  const refresh = useCallback(() => {
    void fetchData();
  }, [fetchData]);

  return { points, loading, error, refresh };
}
