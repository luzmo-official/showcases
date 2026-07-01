'use client';

import React from 'react';
import { useDevStackLabels } from '@/components/dev/DevStackLabelsProvider';

export type StackLabelVariant = 'ack' | 'flex' | 'data' | 'utils';

const VARIANT_STYLES: Record<StackLabelVariant, string> = {
  ack: 'border-emerald-400/95 bg-emerald-50/98 text-emerald-950 shadow-md shadow-emerald-900/10 ring-1 ring-emerald-600/15',
  flex: 'border-sky-400/95 bg-sky-50/98 text-sky-950 shadow-md shadow-sky-900/10 ring-1 ring-sky-600/15',
  data: 'border-amber-400/95 bg-amber-50/98 text-amber-950 shadow-md shadow-amber-900/10 ring-1 ring-amber-600/15',
  utils: 'border-violet-400/95 bg-violet-50/98 text-violet-950 shadow-md shadow-violet-900/10 ring-1 ring-violet-600/15',
};

const VARIANT_PILL: Record<StackLabelVariant, string> = {
  ack: 'bg-emerald-600/15 text-emerald-900',
  flex: 'bg-sky-600/15 text-sky-900',
  data: 'bg-amber-600/15 text-amber-900',
  utils: 'bg-violet-600/15 text-violet-900',
};

function inferVariant(label: string): StackLabelVariant {
  const t = label.trim();
  if (/^flex/i.test(t)) return 'flex';
  if (/^data\s*api/i.test(t) || /^data\s*\+/i.test(t)) return 'data';
  if (/utils/i.test(t)) return 'utils';
  return 'ack';
}

/**
 * Non-interactive corner label for developers (ACK vs Flex vs Data API).
 * Shows a short stack pill, technical tag, and one-line utility. Does not block pointer events.
 */
export function StackLabelBadge({
  label,
  description,
  title,
  variant,
  children,
  className = '',
  position = 'top-left',
}: {
  label: string;
  /** What this surface is for (one short sentence). */
  description: string;
  /** Extra detail for hover (defaults to label + description). */
  title?: string;
  /** Color accent; optional — inferred from `label` when omitted. */
  variant?: StackLabelVariant;
  children: React.ReactNode;
  className?: string;
  position?: 'top-left' | 'top-right';
}) {
  const { enabled } = useDevStackLabels();
  const v = variant ?? inferVariant(label);
  const panelClass = VARIANT_STYLES[v];
  const pillClass = VARIANT_PILL[v];

  const posClass =
    position === 'top-right' ? 'top-2 right-2 left-auto items-end text-right' : 'top-2 left-2 items-start text-left';

  const tooltip = title?.trim() ? title.trim() : `${label}\n\n${description}`;

  return (
    <div className={`relative ${className}`}>
      {children}
      {enabled && (
        <div
          title={tooltip}
          className={`pointer-events-none absolute ${posClass} z-[60] flex max-w-[min(100%,22rem)] flex-col gap-0.5 rounded-lg border-2 px-2 py-1.5 font-sans ${panelClass}`}
        >
          <div
            className={`flex flex-wrap items-center gap-1.5 ${
              position === 'top-right' ? 'justify-end' : 'justify-start'
            }`}
          >
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${pillClass}`}
            >
              {v === 'flex' ? 'Flex' : v === 'data' ? 'Data' : v === 'utils' ? 'Utils' : 'ACK'}
            </span>
            <span className="min-w-0 break-words font-mono text-[10px] font-semibold leading-tight tracking-tight">
              {label}
            </span>
          </div>
          <p
            className={`max-w-[20rem] text-[9px] font-medium leading-snug text-slate-700/95 ${
              position === 'top-right' ? 'text-right' : 'text-left'
            }`}
          >
            {description}
          </p>
        </div>
      )}
    </div>
  );
}
