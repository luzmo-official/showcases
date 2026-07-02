'use client';

/**
 * Luzmo ACK `luzmo-item-grid` — draggable/resizable Flex charts on the workbook canvas.
 *
 * Flex `options.interactivity` only exposes **export** in-chart; data / style / duplicate / delete are **ACK grid**
 * actions. The native `grid-item-actions-popover` sits under the Flex iframe, so we hide it and render
 * `WorkbookTileActions` fixed to the hovered tile instead.
 */

import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import type { LuzmoEmbedVizItem } from '@luzmo/embed';
import '@luzmo/analytics-components-kit/item-grid';
import type { CanvasItemDefinition } from '@/lib/types';
import { WorkbookTileActions } from '@/components/ack/WorkbookTileActions';
import { getApiHost, getAppServer } from '@/lib/services/luzmo-service';
import {
  canvasItemsToAckGridItems,
  ackGridPayloadToCanvasItems,
  type AckGridItemPayload,
} from '@/lib/ack/grid-bridge';
import { routedataGridThemeConfig } from '@/lib/luzmo/flex-chart-theme';
import { StackLabelBadge } from '@/components/dev/StackLabelBadge';

const GRID_TILE_CHROME_STYLE_ID = 'routedata-grid-tile-chrome';

/**
 * - Hide ACK action popover (we use `WorkbookTileActions`).
 * - Expand `.grid-item-drag-handle` to a full-width top strip above the Flex iframe, hide the arrow icon,
 *   so the whole title band behaves as the drag surface (GridStack `handle: ".grid-item-drag-handle"`).
 */
const GRID_TILE_CHROME_CSS = `
  .grid-stack-item > .grid-item-actions-popover {
    display: none !important;
  }
  .grid-stack-item-content > .grid-item-drag-handle {
    position: absolute !important;
    left: 0 !important;
    right: 0 !important;
    top: 0 !important;
    width: 100% !important;
    height: 48px !important;
    max-height: 48px !important;
    z-index: 30 !important;
    cursor: grab !important;
    background: transparent !important;
    padding: 0 !important;
    margin: 0 !important;
    border: none !important;
    box-shadow: none !important;
  }
  .grid-stack-item-content > .grid-item-drag-handle:active {
    cursor: grabbing !important;
  }
  .grid-stack-item-content > .grid-item-drag-handle luzmo-icon {
    display: none !important;
  }
`;

type LuzmoItemGridElement = HTMLElement & {
  authKey?: string;
  authToken?: string;
  appServer?: string;
  apiHost?: string;
  language?: string;
  contentLanguage?: string;
  columns?: number;
  rowHeight?: number;
  viewMode?: boolean;
  theme?: Record<string, unknown>;
  items?: AckGridItemPayload[];
};

interface AckDashboardGridProps {
  authKey: string;
  authToken: string;
  embedKey: string;
  canvasItems: CanvasItemDefinition[];
  globalFilters: unknown[];
  onLayoutSync: (items: CanvasItemDefinition[]) => void;
  onEditData: (item: CanvasItemDefinition) => void;
  onEditOptions: (item: CanvasItemDefinition) => void;
  onRemoveItem: (id: string) => void;
  onDuplicateItem?: (item: CanvasItemDefinition) => void;
  disabled?: boolean;
}

function resolveGridVizAtPoint(
  gridHost: HTMLElement | null,
  clientX: number,
  clientY: number
): { viz: LuzmoEmbedVizItem | null; itemId: string | null; tileRect: DOMRect | null } {
  const root = gridHost?.shadowRoot;
  if (!root) return { viz: null, itemId: null, tileRect: null };
  const tiles = root.querySelectorAll('[gs-id]');
  for (const el of tiles) {
    if (!(el instanceof HTMLElement)) continue;
    const r = el.getBoundingClientRect();
    if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) continue;
    const gid = el.getAttribute('gs-id');
    const v = el.querySelector('luzmo-embed-viz-item');
    return {
      itemId: gid,
      viz: v ? (v as unknown as LuzmoEmbedVizItem) : null,
      tileRect: r,
    };
  }
  return { viz: null, itemId: null, tileRect: null };
}

export default function AckDashboardGrid({
  authKey,
  authToken,
  embedKey,
  canvasItems,
  globalFilters,
  onLayoutSync,
  onEditData,
  onEditOptions,
  onRemoveItem,
  onDuplicateItem,
  disabled = false,
}: AckDashboardGridProps) {
  const gridRef = useRef<HTMLElement>(null);
  const scrollWrapRef = useRef<HTMLDivElement>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeViz, setActiveViz] = useState<LuzmoEmbedVizItem | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [tileRect, setTileRect] = useState<DOMRect | null>(null);

  const canvasRef = useRef(canvasItems);
  const onLayoutSyncRef = useRef(onLayoutSync);
  const onEditDataRef = useRef(onEditData);
  const onEditOptionsRef = useRef(onEditOptions);
  const onRemoveItemRef = useRef(onRemoveItem);

  // Keep the "latest" refs current for use inside imperative grid event handlers.
  useEffect(() => {
    canvasRef.current = canvasItems;
    onLayoutSyncRef.current = onLayoutSync;
    onEditDataRef.current = onEditData;
    onEditOptionsRef.current = onEditOptions;
    onRemoveItemRef.current = onRemoveItem;
  });

  const gridItems = useMemo(
    () => canvasItemsToAckGridItems(canvasItems, globalFilters),
    [canvasItems, globalFilters]
  );

  const legacyCount = useMemo(
    () => canvasItems.filter((i) => i.type === 'data-chart').length,
    [canvasItems]
  );

  const requiredGridHeight = useMemo(() => {
    const active = canvasItems.filter((i) => i.type !== 'data-chart');
    const maxRowUnits = active.reduce(
      (max, item) => Math.max(max, item.position.row + item.position.sizeY),
      32
    );
    return Math.max(520, maxRowUnits * 16 + 48);
  }, [canvasItems]);

  const applyPointer = useCallback((clientX: number, clientY: number) => {
    const { viz, itemId, tileRect: tr } = resolveGridVizAtPoint(
      gridRef.current as HTMLElement | null,
      clientX,
      clientY
    );
    if (viz && itemId && tr) {
      setActiveViz(viz);
      setActiveItemId(itemId);
      setTileRect(tr);
    } else {
      setActiveViz(null);
      setActiveItemId(null);
      setTileRect(null);
    }
  }, []);

  useEffect(() => {
    const el = gridRef.current as LuzmoItemGridElement | null;
    if (!el || !authKey) return;

    const handleChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ items: AckGridItemPayload[] }>).detail;
      if (!detail?.items) return;
      const next = ackGridPayloadToCanvasItems(canvasRef.current, detail.items);
      onLayoutSyncRef.current(next);
    };

    const handleItemAction = (e: Event) => {
      const ce = e as CustomEvent<{
        action: string;
        id: string;
        deletedId?: string;
        items: AckGridItemPayload[];
        type?: string;
        slots?: unknown[];
        options?: Record<string, unknown>;
      }>;
      const d = ce.detail;
      if (!d) return;

      if (d.action === 'delete') {
        const rid = d.deletedId || d.id;
        if (rid) onRemoveItemRef.current(rid);
        return;
      }

      const fromGrid = d.items?.find((x) => x.id === d.id);
      const prev = canvasRef.current.find((i) => i.id === d.id);

      if (d.action === 'edit-data') {
        if (fromGrid && prev) {
          onEditDataRef.current({
            ...prev,
            type: fromGrid.type,
            slots: (fromGrid.slots ?? prev.slots) as CanvasItemDefinition['slots'],
            options: (fromGrid.options ?? prev.options) as Record<string, unknown>,
          });
        } else if (prev) {
          onEditDataRef.current(prev);
        }
        return;
      }

      if (d.action === 'item-options') {
        if (fromGrid && prev) {
          onEditOptionsRef.current({
            ...prev,
            type: fromGrid.type,
            slots: (fromGrid.slots ?? prev.slots) as CanvasItemDefinition['slots'],
            options: (fromGrid.options ?? prev.options) as Record<string, unknown>,
          });
        } else if (prev) {
          onEditOptionsRef.current(prev);
        }
      }
    };

    el.addEventListener('luzmo-item-grid-changed', handleChanged);
    el.addEventListener('luzmo-item-grid-item-action', handleItemAction);
    return () => {
      el.removeEventListener('luzmo-item-grid-changed', handleChanged);
      el.removeEventListener('luzmo-item-grid-item-action', handleItemAction);
    };
  }, [authKey, authToken, embedKey]);

  useEffect(() => {
    const el = gridRef.current as LuzmoItemGridElement | null;
    if (!el || disabled) return;
    el.authKey = authKey;
    el.authToken = authToken;
    el.appServer = getAppServer();
    el.apiHost = getApiHost();
    el.language = 'en';
    el.contentLanguage = 'en';
    el.columns = 48;
    el.rowHeight = 16;
    el.viewMode = false;
    el.theme = routedataGridThemeConfig() as unknown as Record<string, unknown>;
    el.items = gridItems;
  }, [authKey, authToken, gridItems, embedKey, disabled]);

  useEffect(() => {
    const host = gridRef.current;
    if (!host || disabled) return;
    const root = host.shadowRoot;
    if (!root) return;

    const inject = () => {
      if (root.getElementById(GRID_TILE_CHROME_STYLE_ID)) return;
      const style = document.createElement('style');
      style.id = GRID_TILE_CHROME_STYLE_ID;
      style.textContent = GRID_TILE_CHROME_CSS;
      root.appendChild(style);
    };

    inject();
    const t = window.setTimeout(inject, 0);
    return () => {
      window.clearTimeout(t);
      root.getElementById(GRID_TILE_CHROME_STYLE_ID)?.remove();
    };
  }, [embedKey, disabled, authKey]);

  const onGridPointerMove = useCallback(
    (e: PointerEvent) => {
      if (leaveTimer.current) {
        clearTimeout(leaveTimer.current);
        leaveTimer.current = null;
      }
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      applyPointer(e.clientX, e.clientY);
    },
    [applyPointer]
  );

  const onGridPointerLeave = useCallback(() => {
    leaveTimer.current = setTimeout(() => {
      setActiveViz(null);
      setActiveItemId(null);
      setTileRect(null);
      lastPointerRef.current = null;
    }, 380);
  }, []);

  useEffect(() => {
    const wrap = scrollWrapRef.current;
    if (!wrap || disabled) return;
    wrap.addEventListener('pointermove', onGridPointerMove, true);
    wrap.addEventListener('pointerleave', onGridPointerLeave);
    const onScroll = () => {
      const p = lastPointerRef.current;
      if (p) applyPointer(p.x, p.y);
    };
    wrap.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
      wrap.removeEventListener('pointermove', onGridPointerMove, true);
      wrap.removeEventListener('pointerleave', onGridPointerLeave);
      wrap.removeEventListener('scroll', onScroll);
    };
  }, [disabled, embedKey, onGridPointerMove, onGridPointerLeave, applyPointer]);

  if (!authKey || !authToken) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-sm text-gray-500">
        Connect to Luzmo to load the dashboard grid.
      </div>
    );
  }

  if (disabled) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-sky-200 bg-sky-50/40 p-8 text-sm text-sky-900/90">
        Dashboard grid will load after the Luzmo embed token matches this dataset.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 min-w-0">
      {legacyCount > 0 && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          <span className="font-semibold">{legacyCount}</span> legacy “data chart” item(s) are kept in the workbook but are
          not shown in the ACK grid. Remove them or rebuild as Flex charts.
        </div>
      )}
      <StackLabelBadge
        className="relative flex-1 min-h-[520px] min-w-0 rounded-xl border border-gray-200 bg-white overflow-auto"
        label="luzmo-item-grid"
        description="ACK grid: drag, resize, and persist Flex chart tiles; syncs layout with the workbook model."
        title="Luzmo Analytics Components Kit — luzmo-item-grid (Lit)"
      >
      <div
        ref={scrollWrapRef}
        className="relative h-full min-h-[520px] w-full overflow-auto"
        style={
          {
            ['--luzmo-item-grid-background']: '#ffffff',
            ['--luzmo-item-grid-min-height']: '100%',
          } as React.CSSProperties
        }
      >
        <WorkbookTileActions
          tileRect={tileRect}
          activeViz={activeViz}
          activeItemId={activeItemId}
          canvasItems={canvasItems}
          onEditData={onEditData}
          onEditOptions={onEditOptions}
          onDuplicateItem={onDuplicateItem}
          onRemoveItem={onRemoveItem}
        />
        <luzmo-item-grid
          key={embedKey}
          ref={gridRef}
          placement-item-actions-menu="right-start"
          className="block w-full min-h-[480px]"
          style={{ height: `${requiredGridHeight}px` }}
        />
      </div>
      </StackLabelBadge>
    </div>
  );
}
