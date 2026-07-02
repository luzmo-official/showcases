'use client';

import React from 'react';
import type { NativeChartSpec } from '@/lib/types';
import { useNativeChartData } from '@/hooks/useNativeChartData';
import { DataChartVisualization } from '@/components/charts/DataChartVisualization';
import { StackLabelBadge } from '@/components/dev/StackLabelBadge';

interface DataChartCanvasProps {
  authKey: string;
  authToken: string;
  nativeChart: NativeChartSpec;
  compact?: boolean;
}

/**
 * Canvas cell: Luzmo **data** (embed key/token + `/0.1.0/data`) + SVG — no Flex.
 * @see https://developer.luzmo.com/guide/dashboard-embedding--generating-an-authorization-token.md
 */
export function DataChartCanvas({ authKey, authToken, nativeChart, compact }: DataChartCanvasProps) {
  const { points, loading, error } = useNativeChartData(authKey, authToken, nativeChart);

  if (!authKey || !authToken) {
    return (
      <div className="h-full flex items-center justify-center text-[10px] text-gray-400 p-4">
        Waiting for embed authentication…
      </div>
    );
  }

  return (
    <StackLabelBadge
      label="POST /0.1.0/data + SVG"
      description="Renders charts from Luzmo’s data endpoint and our SVG layer—no Flex iframe in this cell."
      title="Native chart tile: Luzmo Data API + in-app visualization (not LuzmoVizItemComponent)."
      variant="data"
      className="h-full min-h-0"
    >
      <DataChartVisualization
        kind={nativeChart.kind}
        points={points}
        loading={loading}
        error={error}
        compact={compact}
      />
    </StackLabelBadge>
  );
}
