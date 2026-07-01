'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

/** Minimal gray header icons — matches Luzmo-style KPI card (export · duplicate · settings · delete). */
export function ChromeIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-500/60"
    >
      {children}
    </button>
  );
}

export function ExportMenuDropdown({
  onCsv,
  onXlsx,
  onPng,
}: {
  onCsv: () => void;
  onXlsx: () => void;
  onPng: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close, true);
    return () => document.removeEventListener('mousedown', close, true);
  }, [open]);

  const pick = useCallback(
    (fn: () => void) => () => {
      fn();
      setOpen(false);
    },
    []
  );

  return (
    <div ref={rootRef} className="relative inline-flex">
      <ChromeIconButton label="Export" onClick={() => setOpen((o) => !o)}>
        <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" />
        </svg>
      </ChromeIconButton>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[9rem] rounded-lg border border-slate-200/90 bg-white py-1 shadow-lg ring-1 ring-slate-900/5"
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-[12px] text-slate-700 hover:bg-slate-50"
            onClick={pick(onCsv)}
          >
            CSV
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-[12px] text-slate-700 hover:bg-slate-50"
            onClick={pick(onXlsx)}
          >
            Excel
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-[12px] text-slate-700 hover:bg-slate-50"
            onClick={pick(onPng)}
          >
            PNG
          </button>
        </div>
      )}
    </div>
  );
}
