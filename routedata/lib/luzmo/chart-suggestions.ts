/**
 * Deterministic Flex chart suggestions from the user’s **selected** dataset columns.
 * Used with `LuzmoVizItemComponent` — see Luzmo Flex docs.
 *
 * @see https://developer.luzmo.com/guide/flex--introduction--basic-usage.md
 */

export interface DatasetColumn {
  id: string;
  name: Record<string, string>;
  type: string;
  subtype?: string;
  lowestLevel?: number;
  highestLevel?: number;
  hierarchy_enabled?: boolean;
}

export interface FlexSuggestionChart {
  title: string;
  chartType: string;
  slots: unknown[];
  options: Record<string, unknown>;
}

const SLOT_ORDER: Record<string, string[]> = {
  'column-chart': ['x-axis', 'measure', 'legend'],
  'bar-chart': ['y-axis', 'measure', 'legend'],
  'line-chart': ['x-axis', 'measure', 'legend'],
  'area-chart': ['x-axis', 'measure', 'legend'],
  'donut-chart': ['category', 'measure'],
  'evolution-number': ['evolution', 'measure'],
};

export function makeFlexSlotContent(
  col: DatasetColumn,
  datasetId: string,
  levelOverride?: number
): Record<string, unknown> {
  const ds = datasetId.trim();
  const entry: Record<string, unknown> = {
    columnId: col.id,
    datasetId: ds,
    type: col.type,
    label: col.name,
  };
  if (col.subtype) entry.subtype = col.subtype;
  if (col.type === 'numeric') {
    entry.aggregationFunc = 'sum';
  }
  if (col.type === 'datetime') {
    const requestedLevel = levelOverride ?? col.lowestLevel ?? 3;
    entry.level = Math.min(requestedLevel, 5);
    if (col.lowestLevel != null) entry.lowestLevel = col.lowestLevel;
    if (col.highestLevel != null) entry.highestLevel = col.highestLevel;
  }
  if (col.type === 'hierarchy') {
    const lvl = levelOverride ?? col.lowestLevel ?? 1;
    entry.level = lvl;
    if (col.lowestLevel != null) entry.lowestLevel = col.lowestLevel;
    if (col.highestLevel != null) entry.highestLevel = col.highestLevel;
    if (col.hierarchy_enabled != null) entry.hierarchy_enabled = col.hierarchy_enabled;
  } else if (isCategoricalColumn(col)) {
    const lvl = levelOverride ?? col.lowestLevel ?? 1;
    entry.level = lvl;
    if (col.lowestLevel != null) entry.lowestLevel = col.lowestLevel;
    if (col.highestLevel != null) entry.highestLevel = col.highestLevel;
    if (col.hierarchy_enabled != null) entry.hierarchy_enabled = col.hierarchy_enabled;
  }
  return entry;
}

/**
 * Build slots in chart order; append **empty `legend`** when the chart type defines one but we only
 * filled category + measure (some Flex runtimes wait if `legend` is missing entirely).
 */
export function buildSlotsForChart(
  chartType: string,
  columnsInSlotOrder: DatasetColumn[],
  datasetId: string
): unknown[] {
  const order = SLOT_ORDER[chartType];
  if (!order?.length) return [];

  const slots: { name: string; content: unknown[] }[] = [];
  for (let i = 0; i < order.length && i < columnsInSlotOrder.length; i++) {
    const name = order[i];
    const col = columnsInSlotOrder[i];
    slots.push({
      name,
      content: [makeFlexSlotContent(col, datasetId)],
    });
  }

  if (order.includes('legend') && !slots.some((s) => s.name === 'legend')) {
    slots.push({ name: 'legend', content: [] });
  }

  return slots;
}

function labelEn(c: DatasetColumn): string {
  return c.name?.en || Object.values(c.name || {})[0] || c.id;
}

/** Category axis: explicit hierarchy or non-measure / non-time (Luzmo types vary). */
function isCategoricalColumn(col: DatasetColumn): boolean {
  const t = col.type;
  if (t === 'hierarchy') return true;
  if (t === 'numeric' || t === 'datetime') return false;
  if (t === 'spatial') return false;
  return true;
}

/**
 * Small, predictable set of suggestions — only combinations we can map cleanly to Flex slots.
 */
export function generateFlexSuggestions(
  selectedCols: DatasetColumn[],
  datasetId: string
): FlexSuggestionChart[] {
  const out: FlexSuggestionChart[] = [];
  const seen = new Set<string>();

  const push = (chartType: string, title: string, cols: DatasetColumn[]) => {
    const key = `${chartType}:${cols.map((c) => c.id).join(',')}`;
    if (seen.has(key)) return;
    seen.add(key);
    const slots = buildSlotsForChart(chartType, cols, datasetId);
    if (!slots.length) return;
    out.push({ title, chartType, slots, options: {} });
  };

  const numerics = selectedCols.filter((c) => c.type === 'numeric');
  const datetimes = selectedCols.filter((c) => c.type === 'datetime');
  const categories = selectedCols.filter(isCategoricalColumn);

  const cat = categories[0];
  const num = numerics[0];

  if (cat && num) {
    push('column-chart', `Shipment Volume by ${labelEn(cat)}`, [cat, num]);
    push('bar-chart', `Carrier / Route Ranking by ${labelEn(num)}`, [cat, num]);
    push('donut-chart', `Distribution of ${labelEn(num)} by ${labelEn(cat)}`, [cat, num]);
  }

  if (datetimes[0] && numerics[0]) {
    const d = datetimes[0];
    const n = numerics[0];
    push('line-chart', `Delivery Performance Trend (${labelEn(n)} over ${labelEn(d)})`, [d, n]);
    push('evolution-number', `${labelEn(n)} KPI`, [d, n]);
  }

  return out;
}
