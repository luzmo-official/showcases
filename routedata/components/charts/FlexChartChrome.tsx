'use client';

import React, { useCallback, useState, useRef, useEffect } from 'react';
import type { LuzmoEmbedVizItem } from '@luzmo/embed';
import { downloadFromViz } from '@/components/charts/viz-export';
import { ChromeIconButton, ExportMenuDropdown } from '@/components/charts/ChartChromeActions';

export interface FlexChartChromeProps {
  chartType: string;
  title: string;
  subtitle?: string;
  /** Ref to `LuzmoVizItemComponent` for exports */
  vizRef: React.RefObject<LuzmoEmbedVizItem | null>;
  children: React.ReactNode;
  onDuplicate?: () => void;
  onOpenSettings?: () => void;
  onDelete?: () => void;
  onTitleChange?: (newTitle: string) => void;
  className?: string;
}

function InlineEditableTitle({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = useCallback(() => {
    setDraft(value);
    setEditing(true);
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = useCallback(() => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value && onChange) {
      onChange(trimmed);
    } else {
      setDraft(value);
    }
  }, [draft, value, onChange]);

  if (readOnly || !onChange) {
    return (
      <p className="truncate text-[15px] font-semibold leading-snug tracking-tight text-slate-900">
        {value || 'Chart'}
      </p>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEditing}
        className="group/title flex min-w-0 items-center gap-1 truncate text-left"
        title="Click to rename"
      >
        <span className="truncate text-[15px] font-semibold leading-snug tracking-tight text-slate-900">
          {value || 'Chart'}
        </span>
        <svg
          className="h-3 w-3 shrink-0 text-slate-400 opacity-0 transition-opacity group-hover/title:opacity-100"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
        </svg>
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') {
          setDraft(value);
          setEditing(false);
        }
      }}
      className="w-full min-w-0 rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[15px] font-semibold leading-snug tracking-tight text-slate-900 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
      autoFocus
    />
  );
}

/**
 * KPI-style card chrome: light header, title left, thin gray action icons right (export · duplicate · settings · delete).
 */
export function FlexChartChrome({
  chartType,
  title,
  subtitle,
  vizRef,
  children,
  onDuplicate,
  onOpenSettings,
  onDelete,
  onTitleChange,
  className = '',
}: FlexChartChromeProps) {
  const safeTitle = title || 'Chart';

  const dl = useCallback(
    (fmt: 'csv' | 'xlsx' | 'png') => () => {
      void downloadFromViz(vizRef.current, fmt, safeTitle);
    },
    [vizRef, safeTitle]
  );

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ${className}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/95 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <InlineEditableTitle value={safeTitle} onChange={onTitleChange} readOnly={!onTitleChange} />
          {subtitle ? (
            <p className="truncate text-[12px] text-slate-500">{subtitle}</p>
          ) : (
            <p className="truncate text-[11px] capitalize text-slate-400">{chartType.replace(/-/g, ' ')}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <ExportMenuDropdown onCsv={dl('csv')} onXlsx={dl('xlsx')} onPng={dl('png')} />
          {onDuplicate && (
            <ChromeIconButton label="Duplicate" onClick={onDuplicate}>
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </ChromeIconButton>
          )}
          {onOpenSettings && (
            <ChromeIconButton label="Chart settings" onClick={onOpenSettings}>
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
          {onDelete && (
            <ChromeIconButton label="Remove" onClick={onDelete}>
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </ChromeIconButton>
          )}
        </div>
      </div>
      <div className="relative min-h-0 flex-1 bg-white">{children}</div>
    </div>
  );
}
