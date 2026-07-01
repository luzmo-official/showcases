'use client';

import React from 'react';
import type { IconDefinition } from '@luzmo/icons';
import {
  luzmoAlluvialDiagram,
  luzmoAreaChart,
  luzmoAreaChart100,
  luzmoAreaChartSimple,
  luzmoAreaChartStacked,
  luzmoAreaChartStream,
  luzmoBarChart,
  luzmoBarChartGrouped,
  luzmoBarChartSimple,
  luzmoBarChartStacked,
  luzmoBoxPlot,
  luzmoBoxPlotWidth,
  luzmoBubbleChart,
  luzmoBubbleChartSimple,
  luzmoBulletChart,
  luzmoCandlestickChart,
  luzmoChoroplethMap,
  luzmoCirclePackChart,
  luzmoCircularGauge,
  luzmoColumnChart,
  luzmoColumnChartGrouped,
  luzmoColumnChartSimple,
  luzmoColumnChartStacked,
  luzmoCombinationChart,
  luzmoConditionalNumber,
  luzmoDonutChart,
  luzmoDonutChartHalf,
  luzmoDonutChartSimple,
  luzmoEvolutionNumber,
  luzmoEvolutionNumberSimple,
  luzmoFunnelChart,
  luzmoFunnelChartSimple,
  luzmoHeatMap,
  luzmoHeatTable,
  luzmoHexbinMap,
  luzmoKagiChart,
  luzmoLineChart,
  luzmoLineChartColor,
  luzmoLineChartForecast,
  luzmoLineChartGrouped,
  luzmoLineChartMultiples,
  luzmoLineChartSimple,
  luzmoMarkerMap,
  luzmoOhlcChart,
  luzmoParallelCoordinatesPlot,
  luzmoPieChart,
  luzmoPieChartHalf,
  luzmoPieChartSimple,
  luzmoPivotTable,
  luzmoPivotTableSimple,
  luzmoPyramidChart,
  luzmoRadarChart,
  luzmoRegularTable,
  luzmoRegularTableSimple,
  luzmoRouteMap,
  luzmoSankeyDiagram,
  luzmoScatterPlot,
  luzmoScatterPlotBubble,
  luzmoScatterPlotBubbleGrouped,
  luzmoScatterPlotGrouped,
  luzmoScatterPlotMultiples,
  luzmoSpeedometerChart,
  luzmoSpikeMap,
  luzmoStripPlot,
  luzmoSunburstChart,
  luzmoSymbolMap,
  luzmoTreemapChart,
  luzmoTreemapChartSimple,
  luzmoVennDiagram,
  luzmoWaterfallChart,
  luzmoWordCloudChart,
  luzmoChartBar,
} from '@luzmo/icons';

/** Maps Flex chart type id → icon; explicit so variants with duplicate `.name` in the icons bundle still resolve. */
const CHART_TYPE_ICONS: Record<string, IconDefinition> = {
  'alluvial-diagram': luzmoAlluvialDiagram,
  'area-chart': luzmoAreaChart,
  'area-chart-100': luzmoAreaChart100,
  'area-chart-simple': luzmoAreaChartSimple,
  'area-chart-stacked': luzmoAreaChartStacked,
  'area-chart-stream': luzmoAreaChartStream,
  'bar-chart': luzmoBarChart,
  'bar-chart-grouped': luzmoBarChartGrouped,
  'bar-chart-simple': luzmoBarChartSimple,
  'bar-chart-stacked': luzmoBarChartStacked,
  'box-plot': luzmoBoxPlot,
  'box-plot-width': luzmoBoxPlotWidth,
  'bubble-chart': luzmoBubbleChart,
  'bubble-chart-simple': luzmoBubbleChartSimple,
  'bullet-chart': luzmoBulletChart,
  candlestick: luzmoCandlestickChart,
  'choropleth-map': luzmoChoroplethMap,
  'circle-pack-chart': luzmoCirclePackChart,
  'circular-gauge': luzmoCircularGauge,
  'column-chart': luzmoColumnChart,
  'column-chart-grouped': luzmoColumnChartGrouped,
  'column-chart-simple': luzmoColumnChartSimple,
  'column-chart-stacked': luzmoColumnChartStacked,
  'combination-chart': luzmoCombinationChart,
  'conditional-number': luzmoConditionalNumber,
  'donut-chart': luzmoDonutChart,
  'donut-chart-simple': luzmoDonutChartSimple,
  'donut-chart-half': luzmoDonutChartHalf,
  'evolution-number': luzmoEvolutionNumber,
  'evolution-number-simple': luzmoEvolutionNumberSimple,
  'funnel-chart': luzmoFunnelChart,
  'funnel-chart-simple': luzmoFunnelChartSimple,
  'half-donut-chart': luzmoDonutChartHalf,
  'half-pie': luzmoPieChartHalf,
  'heat-map': luzmoHeatMap,
  'heat-table': luzmoHeatTable,
  'hexbin-map': luzmoHexbinMap,
  'kagi-chart': luzmoKagiChart,
  'line-chart': luzmoLineChart,
  'line-chart-color': luzmoLineChartColor,
  'line-chart-forecast': luzmoLineChartForecast,
  'line-chart-grouped': luzmoLineChartGrouped,
  'line-chart-multiples': luzmoLineChartMultiples,
  'line-chart-simple': luzmoLineChartSimple,
  'marker-map': luzmoMarkerMap,
  'ohlc-chart': luzmoOhlcChart,
  'parallel-coordinates-plot': luzmoParallelCoordinatesPlot,
  'pie-chart': luzmoPieChart,
  'pie-chart-simple': luzmoPieChartSimple,
  'pivot-table': luzmoPivotTable,
  'pivot-table-simple': luzmoPivotTableSimple,
  'pyramid-chart': luzmoPyramidChart,
  'radar-chart': luzmoRadarChart,
  'regular-table': luzmoRegularTable,
  'regular-table-simple': luzmoRegularTableSimple,
  'route-map': luzmoRouteMap,
  'sankey-diagram': luzmoSankeyDiagram,
  'scatter-plot': luzmoScatterPlot,
  'scatter-plot-bubble': luzmoScatterPlotBubble,
  'scatter-plot-bubble-grouped': luzmoScatterPlotBubbleGrouped,
  'scatter-plot-grouped': luzmoScatterPlotGrouped,
  'scatter-plot-multiples': luzmoScatterPlotMultiples,
  'speedometer-chart': luzmoSpeedometerChart,
  'spike-map': luzmoSpikeMap,
  'strip-plot': luzmoStripPlot,
  'sunburst-chart': luzmoSunburstChart,
  'symbol-map': luzmoSymbolMap,
  'treemap-chart': luzmoTreemapChart,
  'treemap-chart-simple': luzmoTreemapChartSimple,
  'venn-diagram': luzmoVennDiagram,
  'waterfall-chart': luzmoWaterfallChart,
  'word-cloud-chart': luzmoWordCloudChart,
  /** Legacy alias */
  'wordcloud-chart': luzmoWordCloudChart,
};

function pathsFromDefinition(def: IconDefinition): { w: number; h: number; paths: string[]; colors?: string[] } {
  const tuple = def.icon;
  const w = tuple[0];
  const h = tuple[1];
  const rawPaths = tuple[2];
  const paths = typeof rawPaths === 'string' ? [rawPaths] : rawPaths;
  const rawColors = tuple[3];
  const colors =
    rawColors === undefined ? undefined : typeof rawColors === 'string' ? [rawColors] : rawColors;
  return { w, h, paths, colors };
}

function fillForToken(token: string | undefined, index: number): { fill: string; fillOpacity?: number } {
  if (!token || token === 'currentColor') {
    return { fill: 'currentColor' };
  }
  if (token.includes('--luzmo-icon-line-color')) {
    return { fill: 'currentColor', fillOpacity: 0.35 };
  }
  if (token.includes('--luzmo-icon-color-2')) {
    return { fill: 'currentColor', fillOpacity: 0.85 };
  }
  if (token.includes('--luzmo-icon-color-1')) {
    return { fill: 'currentColor' };
  }
  if (token.includes('--luzmo-black')) {
    return { fill: 'currentColor' };
  }
  if (token.includes('--luzmo-yellow')) {
    return { fill: 'currentColor', fillOpacity: 0.75 };
  }
  if (token.startsWith('var(')) {
    return { fill: 'currentColor', fillOpacity: index === 0 ? 0.4 : 1 };
  }
  return { fill: token };
}

/** Renders Luzmo Flex chart type icons from `@luzmo/icons` (matches item `name`, e.g. `bar-chart`). */
export function ChartTypeIcon({ chartType, className = 'w-4 h-4' }: { chartType: string; className?: string }) {
  const def = CHART_TYPE_ICONS[chartType] ?? luzmoChartBar;
  const { w, h, paths, colors } = pathsFromDefinition(def);

  return (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {paths.map((d, i) => {
        const token = colors?.[i];
        const { fill, fillOpacity } = fillForToken(token, i);
        return <path key={i} d={d} fill={fill} fillOpacity={fillOpacity} />;
      })}
    </svg>
  );
}
