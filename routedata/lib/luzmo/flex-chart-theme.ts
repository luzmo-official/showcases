import type { VizItemExportType } from '@luzmo/dashboard-contents-types';
import { ROUTE_DATA_CHART_VISUAL } from '@/lib/theme/chart-viz';

/**
 * Merge **Shipbob** chart visuals (`chart-viz` / `SHIPBOB_THEME`) + typography into Flex `options.theme`.
 *
 * - **`grid`:** show Flex title; hide in-chart export control (Flex `interactivity` only has export — other actions
 *   are ACK `luzmo-item-grid` / our `WorkbookTileActions` overlay). Export uses `viz.export()` from the overlay.
 * - **`preview`:** hide Flex title + hide in-chart export UI (use `FlexChartChrome` + `viz.export()`).
 */
export function mergeShipbobFlexOptions(
  base: Record<string, unknown> | undefined,
  opts: {
    titleEn?: string;
    mode: 'grid' | 'preview';
  }
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(base ?? {}) };
  const prevTheme = (next.theme as Record<string, unknown> | undefined) ?? {};

  const mergedTitle = {
    align: 'left' as const,
    bold: true,
    fontSize: 16,
    lineHeight: 22,
    ...((prevTheme.title as Record<string, unknown>) ?? {}),
    /** No hairline under the title in the workbook grid (Flex `theme.title.border`). */
    ...(opts.mode === 'grid' ? { border: false as const } : {}),
  };

  next.theme = {
    ...prevTheme,
    mainColor: ROUTE_DATA_CHART_VISUAL.mainColor,
    itemsBackground: ROUTE_DATA_CHART_VISUAL.itemsBackground,
    colors: [...ROUTE_DATA_CHART_VISUAL.colors],
    font: {
      fontFamily: ROUTE_DATA_CHART_VISUAL.fontFamily,
      fontSize: 13,
      /** Semibold default — Flex theme accepts numeric `font-weight`. */
      'font-weight': 600,
      ...((prevTheme.font as Record<string, unknown>) ?? {}),
    },
    title: mergedTitle,
    borders: {
      'border-radius': '12px',
      ...((prevTheme.borders as Record<string, unknown>) ?? {}),
    },
    boxShadow: {
      size: 'S' as const,
      color: 'rgba(47, 91, 255, 0.09)',
      ...((prevTheme.boxShadow as Record<string, unknown>) ?? {}),
    },
    legend: {
      fontSize: 12,
      lineHeight: 16,
      ...((prevTheme.legend as Record<string, unknown>) ?? {}),
    },
    tooltip: {
      fontSize: 13,
      ...((prevTheme.tooltip as Record<string, unknown>) ?? {}),
    },
  };

  if (opts.titleEn) {
    next.title = { en: opts.titleEn };
  }

  const display = { ...((next.display as Record<string, unknown>) ?? {}) };
  display.title = opts.mode === 'grid';
  next.display = display;

  const inter = { ...((next.interactivity as Record<string, unknown>) ?? {}) };
  /** Grid: no embedded export button — duplicate `WorkbookTileActions` export; preview: same pattern via `FlexChartChrome`. */
  const exportTypes: VizItemExportType[] = [];
  inter.exportTypes = exportTypes;
  inter.availableExportTypes = ['csv', 'xlsx', 'png'] as VizItemExportType[];
  next.interactivity = inter;

  return next;
}

/** Theme for `luzmo-item-grid` surface (cards, spacing). */
export function routedataGridThemeConfig() {
  return {
    type: 'custom' as const,
    darkOrLight: 'light' as const,
    background: ROUTE_DATA_CHART_VISUAL.surface,
    mainColor: ROUTE_DATA_CHART_VISUAL.mainColor,
    itemsBackground: ROUTE_DATA_CHART_VISUAL.itemsBackground,
    colors: [...ROUTE_DATA_CHART_VISUAL.colors],
    font: {
      fontFamily: ROUTE_DATA_CHART_VISUAL.fontFamily,
      fontSize: 13,
      'font-weight': 600,
    },
    itemSpecific: { rounding: 14, padding: 10 },
    margins: [14, 14] as [number, number],
  };
}
