import { v4 as uuidv4 } from 'uuid';
import type { CanvasItemDefinition, ItemFilterGroup } from '@/lib/types';
import { mergeShipbobFlexOptions } from '@/lib/luzmo/flex-chart-theme';
import { mergeFlexOptionsForStoredType, toFlexVizItemType } from '@/lib/luzmo/flex-viz-type';

/** Payload shape from `luzmo-item-grid` events (subset we persist). */
export interface AckGridItemPayload {
  id?: string;
  type: string;
  options?: Record<string, unknown>;
  slots?: unknown[];
  filters?: ItemFilterGroup[];
  position?: { col: number; row: number; sizeX: number; sizeY: number };
}

function withShipbobTheme(options: Record<string, unknown> | undefined, title: string): Record<string, unknown> {
  return mergeShipbobFlexOptions(options ?? {}, {
    titleEn: title,
    mode: 'grid',
  });
}

function titleFromType(type: string): string {
  return type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Maps workbook canvas items → `luzmo-item-grid` `items`.
 * Skips `data-chart` (SVG experiment) — those stay workbook-only below the grid.
 */
export function canvasItemsToAckGridItems(
  items: CanvasItemDefinition[],
  globalFilters: unknown[]
): AckGridItemPayload[] {
  const gf = globalFilters as ItemFilterGroup[];
  return items
    .filter((i) => i.type !== 'data-chart')
    .map((i) => ({
      id: i.id,
      type: toFlexVizItemType(i.type),
      options: withShipbobTheme(
        mergeFlexOptionsForStoredType(i.type, (i.options ?? {}) as Record<string, unknown>),
        i.title || titleFromType(i.type)
      ),
      slots: i.slots,
      filters: [...gf, ...(i.filters || [])],
      position: {
        col: i.position.col,
        row: i.position.row,
        sizeX: i.position.sizeX,
        sizeY: i.position.sizeY,
      },
    }));
}

/**
 * Merges grid output back into canvas items; preserves titles and per-item filters from previous state.
 * Appends `data-chart` items that are not driven by the ACK grid.
 */
export function ackGridPayloadToCanvasItems(
  previous: CanvasItemDefinition[],
  gridItems: AckGridItemPayload[]
): CanvasItemDefinition[] {
  const prevById = new Map(previous.map((p) => [p.id, p]));

  const main: CanvasItemDefinition[] = gridItems.map((g) => {
    const id = g.id || '';
    const existing = id ? prevById.get(id) : undefined;
    return {
      id: id || existing?.id || uuidv4(),
      type: g.type,
      title: existing?.title || titleFromType(g.type),
      options: withShipbobTheme(
        (g.options ?? existing?.options ?? {}) as Record<string, unknown>,
        existing?.title || titleFromType(g.type)
      ),
      slots: (g.slots ?? existing?.slots ?? []) as CanvasItemDefinition['slots'],
      filters: existing?.filters,
      position: {
        col: g.position?.col ?? existing?.position.col ?? 0,
        row: g.position?.row ?? existing?.position.row ?? 0,
        sizeX: g.position?.sizeX ?? existing?.position.sizeX ?? 6,
        sizeY: g.position?.sizeY ?? existing?.position.sizeY ?? 8,
      },
    };
  });

  const legacy = previous.filter((p) => p.type === 'data-chart');
  return [...main, ...legacy];
}
