'use client';

import React, { useMemo } from 'react';
import type { NativeChartKind } from '@/lib/types';
import type { NativeChartPoint } from '@/hooks/useNativeChartData';
import { SHIPBOB_THEME } from '@/lib/theme/shipbob';

const BAR_MAX = 28;
const COLOR = SHIPBOB_THEME.chart.mainColor;
const MUTED = '#94a3b8';

interface DataChartVisualizationProps {
  kind: NativeChartKind;
  points: NativeChartPoint[];
  loading: boolean;
  error: string | null;
  compact?: boolean;
}

export function DataChartVisualization({
  kind,
  points,
  loading,
  error,
  compact = false,
}: DataChartVisualizationProps) {
  const displayPoints = useMemo(() => {
    if (kind === 'bar' && points.length > BAR_MAX) {
      return points.slice(0, BAR_MAX);
    }
    return points;
  }, [kind, points]);

  const { linePath, lineMin, lineMax } = useMemo(() => {
    if (kind !== 'line' || displayPoints.length === 0) {
      return { linePath: '', lineMin: 0, lineMax: 1 };
    }
    const vals = displayPoints.map((p) => p.value);
    const min = Math.min(...vals, 0);
    const max = Math.max(...vals, min + 1);
    const n = displayPoints.length;
    const w = 100;
    const h = 100;
    const pad = 4;
    const innerW = w - pad * 2;
    const innerH = h - pad * 2;
    const parts: string[] = [];
    displayPoints.forEach((p, i) => {
      const x = pad + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
      const t = (p.value - min) / (max - min);
      const y = pad + innerH * (1 - t);
      parts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
    });
    return { linePath: parts.join(' '), lineMin: min, lineMax: max };
  }, [kind, displayPoints]);

  if (loading) {
    return (
      <div className="h-full min-h-[120px] flex items-center justify-center bg-white">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full min-h-[100px] flex flex-col items-center justify-center px-3 text-center bg-red-50/50">
        <p className="text-[10px] font-medium text-red-700">Couldn&apos;t load chart data</p>
        <p className="text-[9px] text-red-600/90 mt-1 line-clamp-3">{error}</p>
      </div>
    );
  }

  if (displayPoints.length === 0) {
    return (
      <div className="h-full min-h-[100px] flex items-center justify-center text-[10px] text-gray-400 bg-gray-50/30">
        No rows returned for this query
      </div>
    );
  }

  if (kind === 'line') {
    return (
      <div className="h-full w-full flex flex-col min-h-0 bg-white">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full flex-1 min-h-[120px]"
          aria-hidden
        >
          <rect width="100" height="100" fill="#fafafa" />
          <path d={linePath} fill="none" stroke={COLOR} strokeWidth={compact ? 1.25 : 1.5} vectorEffect="non-scaling-stroke" />
          {displayPoints.map((p, i) => {
            const n = displayPoints.length;
            const pad = 4;
            const innerW = 100 - pad * 2;
            const innerH = 100 - pad * 2;
            const x = pad + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
            const t = (p.value - lineMin) / (lineMax - lineMin);
            const y = pad + innerH * (1 - t);
            return <circle key={i} cx={x} cy={y} r={compact ? 1.2 : 1.5} fill={COLOR} />;
          })}
        </svg>
        {!compact && (
          <p className="text-[9px] text-center text-gray-400 px-2 pb-1 truncate">
            {displayPoints.length} points · min {lineMin.toFixed(1)} · max {lineMax.toFixed(1)}
          </p>
        )}
      </div>
    );
  }

  // bar
  const maxVal = Math.max(...displayPoints.map((p) => p.value), 1);
  const barGap = compact ? 0.15 : 0.2;
  const barW = (100 / displayPoints.length) * (1 - barGap);
  const labelEvery = Math.ceil(displayPoints.length / 6);

  return (
    <div className="h-full w-full flex flex-col min-h-0 bg-white">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full flex-1 min-h-[120px]" aria-hidden>
        <rect width="100" height="100" fill="#fafafa" />
        {displayPoints.map((p, i) => {
          const slot = 100 / displayPoints.length;
          const x = i * slot + (slot - barW) / 2;
          const h = (p.value / maxVal) * 88;
          const y = 96 - h;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 0.5)}
              fill={COLOR}
              rx={0.4}
            />
          );
        })}
        {/* baseline */}
        <line x1="0" y1="96" x2="100" y2="96" stroke={MUTED} strokeWidth="0.2" vectorEffect="non-scaling-stroke" />
      </svg>
      {!compact && (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 justify-center px-1 pb-1 max-h-14 overflow-y-auto">
          {displayPoints.map((p, i) =>
            i % labelEvery === 0 ? (
              <span key={i} className="text-[8px] text-gray-500 truncate max-w-[72px]" title={p.label}>
                {p.label}
              </span>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
