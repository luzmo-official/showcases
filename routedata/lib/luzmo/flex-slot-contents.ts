/**
 * Slot names and empty slot payloads aligned with `@luzmo/dashboard-contents-types` so
 * `luzmo-item-slot-picker-panel` always receives `item-type` + `slotsContents` shapes it understands.
 */
import {
  areaChartSlotsConfig,
  barChartSlotsConfig,
  boxPlotSlotsConfig,
  bubbleChartSlotsConfig,
  bulletChartSlotsConfig,
  choroplethMapSlotsConfig,
  circlePackChartSlotsConfig,
  circularGaugeSlotsConfig,
  columnChartSlotsConfig,
  combinationChartSlotsConfig,
  conditionalNumberSlotsConfig,
  donutChartSlotsConfig,
  evolutionNumberSlotsConfig,
  funnelChartSlotsConfig,
  heatMapSlotsConfig,
  heatTableSlotsConfig,
  hexbinMapSlotsConfig,
  lineChartSlotsConfig,
  markerMapSlotsConfig,
  ohlcChartSlotsConfig,
  parallelCoordinatesPlotSlotsConfig,
  pivotTableSlotsConfig,
  pyramidChartSlotsConfig,
  radarChartSlotsConfig,
  regularTableSlotsConfig,
  routeMapSlotsConfig,
  sankeyDiagramSlotsConfig,
  scatterPlotSlotsConfig,
  speedometerChartSlotsConfig,
  spikeMapSlotsConfig,
  stripPlotSlotsConfig,
  sunburstChartSlotsConfig,
  symbolMapSlotsConfig,
  treemapChartSlotsConfig,
  vennDiagramSlotsConfig,
  wordcloudChartSlotsConfig,
} from '@luzmo/dashboard-contents-types';
import { flexSlotOrderForChartType } from '@/lib/luzmo/flex-chart-types';
import { toFlexVizItemType } from '@/lib/luzmo/flex-viz-type';

type SlotRow = { name: string; content: unknown[] };

function namesFromConfig(config: readonly { name: string }[]): string[] {
  return config.map((s) => s.name);
}

/** Slot `name` order for each Luzmo catalog `item-type` (matches dashboard-contents-types). */
const SLOT_NAMES_BY_CATALOG: Record<string, string[]> = {
  'area-chart': namesFromConfig(areaChartSlotsConfig),
  'bar-chart': namesFromConfig(barChartSlotsConfig),
  'box-plot': namesFromConfig(boxPlotSlotsConfig),
  'bubble-chart': namesFromConfig(bubbleChartSlotsConfig),
  'bullet-chart': namesFromConfig(bulletChartSlotsConfig),
  'choropleth-map': namesFromConfig(choroplethMapSlotsConfig),
  'circle-pack-chart': namesFromConfig(circlePackChartSlotsConfig),
  'circular-gauge': namesFromConfig(circularGaugeSlotsConfig),
  'column-chart': namesFromConfig(columnChartSlotsConfig),
  'combination-chart': namesFromConfig(combinationChartSlotsConfig),
  'conditional-number': namesFromConfig(conditionalNumberSlotsConfig),
  'donut-chart': namesFromConfig(donutChartSlotsConfig),
  'evolution-number': namesFromConfig(evolutionNumberSlotsConfig),
  'funnel-chart': namesFromConfig(funnelChartSlotsConfig),
  'heat-map': namesFromConfig(heatMapSlotsConfig),
  'heat-table': namesFromConfig(heatTableSlotsConfig),
  'hexbin-map': namesFromConfig(hexbinMapSlotsConfig),
  'line-chart': namesFromConfig(lineChartSlotsConfig),
  'marker-map': namesFromConfig(markerMapSlotsConfig),
  'ohlc-chart': namesFromConfig(ohlcChartSlotsConfig),
  'parallel-coordinates-plot': namesFromConfig(parallelCoordinatesPlotSlotsConfig),
  'pivot-table': namesFromConfig(pivotTableSlotsConfig),
  'pyramid-chart': namesFromConfig(pyramidChartSlotsConfig),
  'radar-chart': namesFromConfig(radarChartSlotsConfig),
  'regular-table': namesFromConfig(regularTableSlotsConfig),
  'route-map': namesFromConfig(routeMapSlotsConfig),
  'sankey-diagram': namesFromConfig(sankeyDiagramSlotsConfig),
  'scatter-plot': namesFromConfig(scatterPlotSlotsConfig),
  'speedometer-chart': namesFromConfig(speedometerChartSlotsConfig),
  'spike-map': namesFromConfig(spikeMapSlotsConfig),
  'strip-plot': namesFromConfig(stripPlotSlotsConfig),
  'sunburst-chart': namesFromConfig(sunburstChartSlotsConfig),
  'symbol-map': namesFromConfig(symbolMapSlotsConfig),
  'treemap-chart': namesFromConfig(treemapChartSlotsConfig),
  'venn-diagram': namesFromConfig(vennDiagramSlotsConfig),
  'wordcloud-chart': namesFromConfig(wordcloudChartSlotsConfig),
};

/** Ordered slot names for a UI chart type (variant ids resolve via `toFlexVizItemType`). */
export function slotNamesForChartType(chartType: string): string[] {
  const catalog = toFlexVizItemType(chartType);
  return SLOT_NAMES_BY_CATALOG[catalog] ?? flexSlotOrderForChartType(chartType);
}

/** Empty `{ name, content: [] }` rows for every slot the ACK panel expects for this chart. */
export function emptySlotsContentsForChartType(chartType: string): SlotRow[] {
  return slotNamesForChartType(chartType).map((name) => ({ name, content: [] }));
}

/**
 * When the chart type changes, preserve field mappings for slots that exist on both sides
 * and ensure every catalog slot row is present (fixes “no slots” for variants like scatter-plot-bubble).
 */
export function slotsForChartTypeChange(nextType: string, prevSlots: unknown[]): unknown[] {
  const empty = emptySlotsContentsForChartType(nextType);
  const prev = (prevSlots || []) as Array<{ name?: string; content?: unknown[] }>;
  const byName = new Map<string, { name: string; content: unknown[] }>();
  for (const s of prev) {
    if (typeof s?.name === 'string' && Array.isArray(s.content) && s.content.length > 0) {
      byName.set(s.name, { name: s.name, content: s.content });
    }
  }
  return empty.map((slot) => {
    const fill = byName.get(slot.name);
    return fill ?? slot;
  });
}
