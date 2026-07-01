'use client';

import React from 'react';
import { useDevStackLabels } from '@/components/dev/DevStackLabelsProvider';

/**
 * Small floating pill, fixed to the bottom-right of the viewport.
 * Toggles the Luzmo stack annotation badges (ACK / Flex / Data / Utils) on every page.
 */
export function DevStackLabelsFloatingToggle() {
  const { enabled, setEnabled } = useDevStackLabels();

  return (
    <div
      className="fixed bottom-3 left-[72px] z-[100] pointer-events-auto"
      role="region"
      aria-label="Luzmo component annotations"
    >
      <label
        className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium shadow-sm backdrop-blur select-none transition ${
          enabled
            ? 'border-emerald-300 bg-emerald-50/95 text-emerald-900 shadow-emerald-900/10'
            : 'border-gray-200 bg-white/90 text-gray-600 hover:border-gray-300 hover:text-gray-800'
        }`}
        title={
          enabled
            ? 'Hide Luzmo component annotations (ACK / Flex / Data / Utils)'
            : 'Show Luzmo component annotations on every Luzmo surface'
        }
      >
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            enabled ? 'bg-emerald-500' : 'bg-gray-300'
          }`}
          aria-hidden
        />
        <span className="leading-tight">Luzmo component annotations</span>
        <span className="relative inline-flex h-4 w-7 shrink-0 items-center">
          <input
            type="checkbox"
            role="switch"
            aria-checked={enabled}
            aria-label="Toggle Luzmo component annotations"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="peer sr-only"
          />
          <span
            className="absolute inset-0 rounded-full bg-gray-200 transition peer-checked:bg-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/40 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-white"
            aria-hidden
          />
          <span
            className="pointer-events-none absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform peer-checked:translate-x-3"
            aria-hidden
          />
        </span>
      </label>
    </div>
  );
}
