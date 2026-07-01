'use client';

import React from 'react';
import { useDevStackLabels } from '@/components/dev/DevStackLabelsProvider';

/**
 * App-wide control for Luzmo stack corner badges (ACK / Flex / Data API).
 * Slim strip aligned with workbook header chrome (gray borders, green accent when on).
 */
export function DevStackLabelsToggleBar() {
  const { enabled, setEnabled } = useDevStackLabels();

  return (
    <div className="flex flex-shrink-0 items-center justify-end border-b border-gray-200 bg-white px-5 py-1">
      <label className="flex cursor-pointer items-center gap-2 select-none">
        <span className="max-w-[min(100%,20rem)] text-right text-[10px] font-medium leading-tight text-gray-500">
          Luzmo Component Annotation
        </span>
        <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
          <input
            type="checkbox"
            role="switch"
            aria-checked={enabled}
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="peer sr-only"
          />
          <span
            className="absolute inset-0 rounded-full bg-gray-200 transition peer-checked:bg-green-600 peer-focus-visible:ring-2 peer-focus-visible:ring-green-500/35 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-white"
            aria-hidden
          />
          <span
            className="pointer-events-none absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform peer-checked:translate-x-4"
            aria-hidden
          />
        </span>
      </label>
    </div>
  );
}
