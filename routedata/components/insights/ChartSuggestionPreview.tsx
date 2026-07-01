'use client';

/**
 * Live Flex preview for a chart suggestion (LuzmoVizItemComponent).
 * Used by SuggestedInsights (AI Mode rail).
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { LuzmoEmbedVizItem } from '@luzmo/embed';
import { getApiHost, getAppServer } from '@/lib/services/luzmo-service';
import { LUZMO_DASHBOARD_CONTENTS_VERSION } from '@/lib/luzmo-embed-constants';
import { useLuzmoTopNavigationGuard } from '@/hooks/useLuzmoTopNavigationGuard';
import { mergeShipbobFlexOptions } from '@/lib/luzmo/flex-chart-theme';
import { mergeFlexOptionsForStoredType, toFlexVizItemType } from '@/lib/luzmo/flex-viz-type';
import { FlexChartChrome } from '@/components/charts/FlexChartChrome';
import { StackLabelBadge } from '@/components/dev/StackLabelBadge';
import type { ChartSuggestion } from '@/hooks/useChartSuggestions';

function sanitizeFlexContextId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 120);
}

export function chartTypeLabel(type: string): string {
  return type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function withPreviewColorByCategory(chartType: string, options: Record<string, unknown>): Record<string, unknown> {
  const colorByCategoryTypes = new Set([
    'bar-chart',
    'column-chart',
    'donut-chart',
    'pie-chart',
    'bubble-chart',
    'wordcloud-chart',
  ]);
  if (!colorByCategoryTypes.has(chartType)) return options;
  return {
    ...options,
    categories: {
      ...((options.categories as Record<string, unknown>) ?? {}),
      colored: true,
    },
  };
}

class FlexPreviewErrorBoundary extends React.Component<
  { children: React.ReactNode; onClose: () => void },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode; onClose: () => void }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'Preview error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn('[FlexPreview]', error?.message || error, info?.componentStack || '');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex flex-col items-center justify-center px-3 py-2 bg-amber-50/90 text-center">
          <p className="text-[10px] text-amber-800 font-medium mb-1">Preview couldn&apos;t load</p>
          <p className="text-[9px] text-amber-700/90 mb-2 line-clamp-2">{this.state.message}</p>
          <button
            type="button"
            onClick={() => this.props.onClose()}
            className="text-[10px] font-semibold text-amber-900 underline"
          >
            Close preview
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ChartSuggestionPreview({
  chart,
  authKey,
  authToken,
  previewIndex,
  onPreviewClose,
}: {
  chart: ChartSuggestion;
  authKey: string;
  authToken: string;
  previewIndex: number;
  onPreviewClose: () => void;
}) {
  const [LuzmoViz, setLuzmoViz] = useState<React.ComponentType<Record<string, unknown>> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [navigationBlocked, setNavigationBlocked] = useState<{ reason: string; url?: string } | null>(null);
  const vizRef = useRef<LuzmoEmbedVizItem | null>(null);

  useLuzmoTopNavigationGuard(true, (reason, detail) => {
    setNavigationBlocked({ reason, url: detail });
  });

  useEffect(() => {
    import('@luzmo/react-embed')
      .then((mod) => {
        setLuzmoViz(() => mod.LuzmoVizItemComponent);
      })
      .catch(() => {
        setLoadError(true);
      });
  }, []);

  const themedOptions = useMemo(
    () => {
      const previewDefaults = withPreviewColorByCategory(
        chart.chartType,
        (chart.options ?? {}) as Record<string, unknown>
      );
      const withPie = mergeFlexOptionsForStoredType(chart.chartType, previewDefaults);
      return mergeShipbobFlexOptions(withPie, { mode: 'preview' });
    },
    [chart.chartType, chart.options]
  );

  const slotsPlain = useMemo(() => {
    try {
      return JSON.parse(JSON.stringify(chart.slots ?? [])) as unknown[];
    } catch {
      return chart.slots ?? [];
    }
  }, [chart.slots]);

  const contextId = useMemo(
    () => sanitizeFlexContextId(`preview-${previewIndex}-${chart.chartType}-${chart.title || 'chart'}`),
    [previewIndex, chart.chartType, chart.title]
  );

  if (loadError) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-2 bg-gray-50 text-center">
        <p className="text-[10px] text-red-600">Could not load Luzmo embed library.</p>
        <button type="button" onClick={onPreviewClose} className="mt-1 text-[10px] text-gray-600 underline">
          Close
        </button>
      </div>
    );
  }

  if (!LuzmoViz || !authKey || !authToken || !slotsPlain.length) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const appServer = getAppServer();
  const apiHost = getApiHost();

  return (
    <StackLabelBadge
      className="relative h-full w-full flex flex-col min-h-0"
      label="LuzmoVizItemComponent"
      description="Live Flex preview for an AI suggestion so you can validate slots before adding to the workbook."
      title="@luzmo/react-embed — suggestion card preview"
      variant="flex"
    >
      {navigationBlocked && (
        <div className="shrink-0 z-10 border-b border-amber-200 bg-amber-50 px-2 py-1.5 text-left">
          <p className="text-[10px] font-semibold text-amber-900">{navigationBlocked.reason}</p>
          {navigationBlocked.url && (
            <p className="text-[9px] text-amber-800/90 break-all mt-0.5 font-mono">{navigationBlocked.url}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-1.5">
            <button
              type="button"
              className="text-[10px] font-semibold text-amber-950 underline"
              onClick={() => setNavigationBlocked(null)}
            >
              Dismiss
            </button>
            <button type="button" className="text-[10px] text-amber-900/80 underline" onClick={onPreviewClose}>
              Close preview
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0 relative">
        {navigationBlocked ? (
          <div className="h-full flex flex-col items-center justify-center px-3 bg-gray-50 text-center">
            <p className="text-[10px] text-gray-500 max-w-[220px]">Preview paused (navigation guard).</p>
          </div>
        ) : (
          <FlexPreviewErrorBoundary onClose={onPreviewClose}>
            <FlexChartChrome
              chartType={chart.chartType}
              title={chart.title?.trim() || 'Chart'}
              subtitle={chartTypeLabel(chart.chartType)}
              vizRef={vizRef}
              onDelete={previewIndex === -1 ? onPreviewClose : undefined}
              className="h-full"
            >
              <LuzmoViz
                ref={(node: unknown) => {
                  vizRef.current = node as LuzmoEmbedVizItem | null;
                }}
                key={`preview-${previewIndex}-${authKey}`}
                appServer={appServer}
                apiHost={apiHost}
                authKey={authKey}
                authToken={authToken}
                type={toFlexVizItemType(chart.chartType)}
                options={themedOptions}
                slots={slotsPlain}
                contextId={contextId}
                dashboardContentsVersion={LUZMO_DASHBOARD_CONTENTS_VERSION}
                style={{ width: '100%', height: '100%' }}
              />
            </FlexChartChrome>
          </FlexPreviewErrorBoundary>
        )}
      </div>
    </StackLabelBadge>
  );
}
