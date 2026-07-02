/**
 * Maps UI / variant chart ids to Luzmo Flex **catalog** `item-type` strings that exist in
 * `@luzmo/dashboard-contents-types` (used by ACK slot panels, embed, and slot seeding).
 *
 * Variants like `scatter-plot-bubble` are not separate catalog entries; they use the base type
 * (e.g. `scatter-plot`) so slot definitions resolve.
 *
 * @see @luzmo/dashboard-contents-types item catalog
 */
export function toFlexVizItemType(storedType: string): string {
  if (storedType === 'pie-chart') return 'donut-chart';
  if (storedType === 'half-pie' || storedType === 'half-donut-chart') return 'donut-chart';
  if (storedType.startsWith('pie-chart')) return 'donut-chart';
  if (storedType === 'word-cloud-chart' || storedType === 'wordcloud-chart') return 'wordcloud-chart';
  if (storedType.startsWith('scatter-plot')) return 'scatter-plot';
  if (storedType.startsWith('bar-chart')) return 'bar-chart';
  if (storedType.startsWith('column-chart')) return 'column-chart';
  if (storedType.startsWith('line-chart')) return 'line-chart';
  if (storedType.startsWith('area-chart')) return 'area-chart';
  if (storedType.startsWith('donut-chart')) return 'donut-chart';
  if (storedType.startsWith('bubble-chart')) return 'bubble-chart';
  if (storedType.startsWith('evolution-number')) return 'evolution-number';
  if (storedType.startsWith('regular-table')) return 'regular-table';
  if (storedType.startsWith('pivot-table')) return 'pivot-table';
  if (storedType.startsWith('funnel-chart')) return 'funnel-chart';
  if (storedType.startsWith('treemap-chart')) return 'treemap-chart';
  if (storedType === 'kagi-chart' || storedType === 'candlestick') return 'ohlc-chart';
  if (storedType === 'box-plot-width') return 'box-plot';
  return storedType;
}

/** Merge donut/pie display mode when we still store UI type as `pie-chart` (or `pie-chart-*`) on canvas items. */
export function mergeFlexOptionsForStoredType(
  storedType: string,
  options: Record<string, unknown>
): Record<string, unknown> {
  if (storedType !== 'pie-chart' && storedType !== 'donut-chart' && !storedType.startsWith('pie-chart')) {
    return options;
  }
  const next = { ...options };
  if (storedType.startsWith('pie-chart') && next.mode === undefined) {
    next.mode = 'pie';
  }
  return next;
}
