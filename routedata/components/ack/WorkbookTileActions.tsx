'use client';

import React from 'react';
import type { LuzmoEmbedVizItem } from '@luzmo/embed';
import type { CanvasItemDefinition } from '@/lib/types';
import { downloadFromViz } from '@/components/charts/viz-export';
import { ChromeIconButton, ExportMenuDropdown } from '@/components/charts/ChartChromeActions';

type Props = {
  /** Screen rect of the hovered grid tile — used to pin actions to the card (above the Flex iframe). */
  tileRect: DOMRect | null;
  activeViz: LuzmoEmbedVizItem | null;
  activeItemId: string | null;
  canvasItems: CanvasItemDefinition[];
  onEditData?: (item: CanvasItemDefinition) => void;
  onEditOptions?: (item: CanvasItemDefinition) => void;
  onDuplicateItem?: (item: CanvasItemDefinition) => void;
  onRemoveItem?: (id: string) => void;
};

/**
 * ACK workbook actions (data, style, duplicate, delete) are not Flex `options.interactivity` — they come from
 * `luzmo-item-grid`. The native popover sits under the Flex iframe; this overlay is `position: fixed` on the tile
 * so controls read as part of the chart chrome.
 */
export function WorkbookTileActions({
  tileRect,
  activeViz,
  activeItemId,
  canvasItems,
  onEditData,
  onEditOptions,
  onDuplicateItem,
  onRemoveItem,
}: Props) {
  const item = activeItemId ? canvasItems.find((c) => c.id === activeItemId) : undefined;
  const title = item?.title?.trim() || 'chart';

  if (!tileRect || !activeViz || !activeItemId) return null;

  return (
    <div
      className="pointer-events-none fixed z-[100]"
      style={{
        top: tileRect.top + 8,
        left: tileRect.right - 8,
        transform: 'translateX(-100%)',
      }}
      aria-hidden={false}
    >
      <div className="pointer-events-auto flex max-w-[min(280px,calc(100vw-24px))] flex-wrap items-center justify-end gap-0.5">
        <ExportMenuDropdown
          onCsv={() => void downloadFromViz(activeViz, 'csv', title)}
          onXlsx={() => void downloadFromViz(activeViz, 'xlsx', title)}
          onPng={() => void downloadFromViz(activeViz, 'png', title)}
        />
        {item && onEditData && (
          <ChromeIconButton label="Chart data" onClick={() => onEditData(item)}>
            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h7" />
            </svg>
          </ChromeIconButton>
        )}
        {item && onEditOptions && (
          <ChromeIconButton label="Chart style" onClick={() => onEditOptions(item)}>
            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </ChromeIconButton>
        )}
        {item && onDuplicateItem && (
          <ChromeIconButton label="Duplicate chart" onClick={() => onDuplicateItem(item)}>
            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </ChromeIconButton>
        )}
        {onRemoveItem && (
          <ChromeIconButton label="Delete chart" onClick={() => onRemoveItem(activeItemId)}>
            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </ChromeIconButton>
        )}
      </div>
    </div>
  );
}
