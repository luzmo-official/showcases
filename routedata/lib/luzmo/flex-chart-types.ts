/**
 * Luzmo Flex chart item type ids from the item catalog (`@luzmo/icons` item-icons),
 * excluding filters, content blocks (text/image/video), iframe, and spacer — not “custom chart” types.
 *
 * Includes three ids whose icon metadata duplicates another `name` in the icons bundle; those still
 * map to distinct Flex types (`scatter-plot-bubble-grouped`, `line-chart-color`, `line-chart-forecast`).
 */
export const FLEX_CHART_TYPES: readonly string[] = [
  'alluvial-diagram',
  'area-chart',
  'area-chart-100',
  'area-chart-simple',
  'area-chart-stacked',
  'area-chart-stream',
  'bar-chart',
  'bar-chart-grouped',
  'bar-chart-simple',
  'bar-chart-stacked',
  'box-plot',
  'box-plot-width',
  'bubble-chart',
  'bubble-chart-simple',
  'bullet-chart',
  'candlestick',
  'choropleth-map',
  'circle-pack-chart',
  'circular-gauge',
  'column-chart',
  'column-chart-grouped',
  'column-chart-simple',
  'column-chart-stacked',
  'combination-chart',
  'conditional-number',
  'donut-chart',
  'donut-chart-simple',
  'evolution-number',
  'evolution-number-simple',
  'funnel-chart',
  'funnel-chart-simple',
  'half-donut-chart',
  'half-pie',
  'heat-map',
  'heat-table',
  'hexbin-map',
  'kagi-chart',
  'line-chart',
  'line-chart-color',
  'line-chart-forecast',
  'line-chart-grouped',
  'line-chart-multiples',
  'line-chart-simple',
  'marker-map',
  'ohlc-chart',
  'parallel-coordinates-plot',
  'pie-chart',
  'pie-chart-simple',
  'pivot-table',
  'pivot-table-simple',
  'pyramid-chart',
  'radar-chart',
  'regular-table',
  'regular-table-simple',
  'route-map',
  'sankey-diagram',
  'scatter-plot',
  'scatter-plot-bubble',
  'scatter-plot-bubble-grouped',
  'scatter-plot-grouped',
  'scatter-plot-multiples',
  'speedometer-chart',
  'spike-map',
  'strip-plot',
  'sunburst-chart',
  'symbol-map',
  'treemap-chart',
  'treemap-chart-simple',
  'venn-diagram',
  'waterfall-chart',
  'word-cloud-chart',
].sort((a, b) => a.localeCompare(b));

export function flexChartTypeLabel(chartType: string): string {
  return chartType
    .split('-')
    .map((part) => (part.length ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ');
}

/** Default slot order when remapping fields after a chart type change (best-effort for Flex families). */
export function flexSlotOrderForChartType(chartType: string): string[] {
  if (chartType.startsWith('bar-chart')) {
    return ['y-axis', 'measure', 'legend'];
  }
  if (chartType.startsWith('column-chart')) {
    return ['x-axis', 'measure', 'legend'];
  }
  if (
    chartType.startsWith('line-chart') ||
    chartType.startsWith('area-chart') ||
    chartType === 'combination-chart'
  ) {
    return ['x-axis', 'measure', 'legend'];
  }
  if (
    chartType.startsWith('donut-chart') ||
    chartType.startsWith('pie-chart') ||
    chartType.startsWith('half-')
  ) {
    return ['category', 'measure', 'legend'];
  }
  if (chartType.startsWith('scatter-plot') || chartType.startsWith('bubble-chart')) {
    return ['x-axis', 'y-axis', 'color'];
  }
  if (chartType === 'heat-map' || chartType === 'heat-table') {
    return ['x-axis', 'y-axis', 'measure'];
  }
  if (
    chartType.startsWith('evolution-number') ||
    chartType === 'conditional-number' ||
    chartType === 'circular-gauge' ||
    chartType === 'speedometer-chart'
  ) {
    return ['measure'];
  }
  if (chartType.includes('table')) {
    return ['measure', 'category'];
  }
  if (chartType.endsWith('-map')) {
    return ['measure', 'category', 'legend'];
  }
  if (
    chartType === 'sankey-diagram' ||
    chartType === 'alluvial-diagram' ||
    chartType === 'parallel-coordinates-plot' ||
    chartType === 'venn-diagram' ||
    chartType.startsWith('box-plot') ||
    chartType === 'strip-plot' ||
    chartType === 'radar-chart' ||
    chartType === 'waterfall-chart' ||
    chartType === 'bullet-chart' ||
    chartType === 'word-cloud-chart' ||
    chartType === 'wordcloud-chart' ||
    chartType === 'ohlc-chart' ||
    chartType === 'candlestick' ||
    chartType === 'kagi-chart' ||
    chartType === 'pyramid-chart' ||
    chartType === 'funnel-chart' ||
    chartType === 'funnel-chart-simple' ||
    chartType === 'sunburst-chart' ||
    chartType.startsWith('treemap-chart') ||
    chartType === 'circle-pack-chart'
  ) {
    return ['measure', 'category', 'legend'];
  }
  return ['measure', 'category', 'legend'];
}

export function chartUsesColorByCategory(chartType: string): boolean {
  if (chartType.startsWith('bar-chart')) return true;
  if (chartType.startsWith('column-chart')) return true;
  if (chartType.startsWith('donut-chart') || chartType.startsWith('pie-chart') || chartType.startsWith('half-')) {
    return true;
  }
  if (chartType.startsWith('bubble-chart')) return true;
  if (chartType === 'word-cloud-chart' || chartType === 'wordcloud-chart') return true;
  return false;
}
