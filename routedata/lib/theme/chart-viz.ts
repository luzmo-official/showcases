import { SHIPBOB_THEME } from '@/lib/theme/shipbob';

/**
 * Shipbob-branded chart visuals for Luzmo Flex `options.theme`, grid chrome, and app accents.
 * (Kept name `ROUTE_DATA_CHART_VISUAL` for stable imports across the app.)
 */
export const ROUTE_DATA_CHART_VISUAL = {
  mainColor: SHIPBOB_THEME.chart.mainColor,
  itemsBackground: SHIPBOB_THEME.chart.itemsBackground,
  colors: [...SHIPBOB_THEME.chart.colors],
  fontFamily: SHIPBOB_THEME.chart.fontFamily,
  surface: SHIPBOB_THEME.brand.background,
  border: SHIPBOB_THEME.brand.border,
  text: SHIPBOB_THEME.brand.text,
  textMuted: SHIPBOB_THEME.brand.textMuted,
} as const;
