'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { FieldMetadata, Sort } from '@/lib/types';
import { useSourceTableData } from '@/hooks/useSourceTableData';

interface SourceTableProps {
  selectedFields: FieldMetadata[];
  datasetId: string;
  authKey: string;
  authToken: string;
  sorts: Sort[];
  onSortChange: (sorts: Sort[]) => void;
}

const FIELD_TYPE_COLORS: Record<string, string> = {
  numeric: 'bg-blue-100 text-blue-700',
  datetime: 'bg-purple-100 text-purple-700',
  hierarchy: 'bg-green-100 text-green-700',
  spatial: 'bg-orange-100 text-orange-700',
};

const FIELD_TYPE_ICONS: Record<string, string> = {
  numeric: '#',
  datetime: '⏱',
  hierarchy: 'Aa',
  spatial: '📍',
};

const DEFAULT_COL_WIDTH = 180;
const MIN_COL_WIDTH = 80;

function unwrap(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  const obj = value as Record<string, unknown>;
  if ('value' in obj) return obj.value;
  if ('id' in obj) return obj.id;
  return value;
}

function formatCellValue(value: unknown, field: FieldMetadata): string {
  const raw = unwrap(value);
  if (raw === null || raw === undefined || raw === '') return '—';

  if (field.type === 'spatial') {
    // Luzmo spatial dimensions are often returned as:
    // - GeoJSON-ish: { type: 'Point', coordinates: [lon, lat] }
    // - Lat/lon objects: { lat, lon } or { lat, lng }
    // We normalize those into a compact `lat, lon` string.
    const formatNumber = (v: unknown) => {
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      if (!Number.isFinite(n)) return null;
      // Keep it compact but readable.
      return Math.abs(n) >= 100 ? n.toFixed(2) : n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
    };

    const formatCoords = (coords: unknown): string | null => {
      if (!Array.isArray(coords) || coords.length < 2) return null;
      const lon = coords[0];
      const lat = coords[1]; // GeoJSON: [lon, lat]
      const fLat = formatNumber(lat);
      const fLon = formatNumber(lon);
      if (fLat === null || fLon === null) return null;
      return `${fLat}, ${fLon}`;
    };

    if (Array.isArray(raw)) {
      const s = formatCoords(raw);
      if (s) return s;
    }

    if (typeof raw === 'object' && raw !== null) {
      const obj = raw as Record<string, unknown>;

      if ('lat' in obj && ('lon' in obj || 'lng' in obj)) {
        const lat = obj.lat;
        const lon = obj.lon ?? obj.lng;
        const fLat = formatNumber(lat);
        const fLon = formatNumber(lon);
        if (fLat !== null && fLon !== null) return `${fLat}, ${fLon}`;
      }

      if ('coordinates' in obj) {
        const s = formatCoords(obj.coordinates);
        if (s) return s;
      }

      if ('geometry' in obj && typeof obj.geometry === 'object' && obj.geometry !== null) {
        const s = formatCoords((obj.geometry as Record<string, unknown>).coordinates);
        if (s) return s;
      }
    }

    // Fallback: avoid `[object Object]` while still showing something useful.
    try {
      return JSON.stringify(raw);
    } catch {
      return String(raw);
    }
  }

  if (field.type === 'numeric') {
    const num = typeof raw === 'number' ? raw : parseFloat(String(raw));
    if (isNaN(num)) return String(raw);
    if (field.subtype === 'currency') {
      return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (Number.isInteger(num)) return num.toLocaleString();
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  if (field.type === 'datetime') {
    const dateStr = String(raw);
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
    return dateStr;
  }

  return String(raw);
}

export default function SourceTable({
  selectedFields,
  datasetId,
  authKey,
  authToken,
  sorts,
  onSortChange,
}: SourceTableProps) {
  const { rows, loading, error, fieldOrder } = useSourceTableData(authKey, authToken, datasetId, selectedFields, sorts);

  // Visual-only column reorder
  const [displayFieldIds, setDisplayFieldIds] = useState<string[]>(selectedFields.map((f) => f.id));
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  // Column widths (visual-only resize)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const resizingRef = useRef<{ fieldId: string; startX: number; startWidth: number } | null>(null);

  // Reconcile the visual column order with the current selection during render
  // (drop removed fields, keep existing order, append newly added ones).
  const selectedIdsKey = selectedFields.map((f) => f.id).join('\u0000');
  const [prevSelectedIdsKey, setPrevSelectedIdsKey] = useState(selectedIdsKey);
  if (selectedIdsKey !== prevSelectedIdsKey) {
    setPrevSelectedIdsKey(selectedIdsKey);
    setDisplayFieldIds((prev) => {
      const selectedIdSet = new Set(selectedFields.map((f) => f.id));
      const next = prev.filter((id) => selectedIdSet.has(id));
      const nextSet = new Set(next);
      for (const f of selectedFields) {
        if (!nextSet.has(f.id)) next.push(f.id);
      }
      return next;
    });
  }

  const selectedFieldMap = useMemo(() => {
    return new Map(selectedFields.map((f) => [f.id, f]));
  }, [selectedFields]);

  const displayFields = useMemo(() => {
    return displayFieldIds.map((id) => selectedFieldMap.get(id)).filter(Boolean) as FieldMetadata[];
  }, [displayFieldIds, selectedFieldMap]);

  const columnIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    fieldOrder.forEach((f, idx) => map.set(f.id, idx));
    return map;
  }, [fieldOrder]);

  const toggleSort = (field: FieldMetadata) => {
    const existing = sorts.find((s) => s.fieldId === field.id);
    if (existing) {
      if (existing.direction === 'asc') {
        onSortChange(sorts.map((s) => s.fieldId === field.id ? { ...s, direction: 'desc' as const } : s));
      } else {
        onSortChange(sorts.filter((s) => s.fieldId !== field.id));
      }
    } else {
      onSortChange([...sorts, { fieldId: field.id, datasetId, direction: 'asc' as const }]);
    }
  };

  const getSortIndicator = (fieldId: string) => {
    const sort = sorts.find((s) => s.fieldId === fieldId);
    if (!sort) return null;
    return sort.direction === 'asc' ? ' ↑' : ' ↓';
  };

  // --- Resize handlers ---
  const handleResizeMouseDown = useCallback((e: React.MouseEvent, fieldId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startWidth = columnWidths[fieldId] ?? DEFAULT_COL_WIDTH;
    resizingRef.current = { fieldId, startX: e.clientX, startWidth };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const diff = moveEvent.clientX - resizingRef.current.startX;
      const newWidth = Math.max(MIN_COL_WIDTH, resizingRef.current.startWidth + diff);
      setColumnWidths((prev) => ({ ...prev, [resizingRef.current!.fieldId]: newWidth }));
    };

    const onMouseUp = () => {
      resizingRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [columnWidths]);

  if (selectedFields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8">
        <h3 className="text-base font-semibold text-gray-800 mb-1">No Source Fields Selected</h3>
        <p className="text-sm text-gray-500 text-center max-w-xs">
          Select shipment, delivery, cost, carrier, or warehouse fields to preview your logistics source table.
        </p>
      </div>
    );
  }

  const reorderDisplayFields = (fromIdx: number, toIdx: number) => {
    setDisplayFieldIds((prev) => {
      const next = [...prev];
      const fromId = next[fromIdx];
      if (!fromId) return prev;
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, fromId);
      return next;
    });
  };

  const tableWidth = displayFields.reduce((sum, f) => sum + (columnWidths[f.id] ?? DEFAULT_COL_WIDTH), 0);

  return (
    <div className="overflow-hidden">
      {loading && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 text-sm border-b border-blue-100">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          Querying data...
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 text-sm border-b border-red-100">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span className="truncate">{error}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="text-sm" style={{ tableLayout: 'fixed', width: tableWidth }}>
          <colgroup>
            {displayFields.map((field) => (
              <col key={field.id} style={{ width: columnWidths[field.id] ?? DEFAULT_COL_WIDTH }} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80">
              {displayFields.map((field, headerIdx) => (
                <th
                  key={field.id}
                  className={`relative px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none whitespace-nowrap ${
                    dragOverIndex === headerIdx ? 'bg-green-50' : ''
                  }`}
                  style={{ width: columnWidths[field.id] ?? DEFAULT_COL_WIDTH }}
                  onClick={(e) => {
                    if (dragIndexRef.current !== null) {
                      e.preventDefault();
                      return;
                    }
                    toggleSort(field);
                  }}
                  onDragEnter={() => {
                    if (dragIndexRef.current === null) return;
                    setDragOverIndex(headerIdx);
                  }}
                  onDragOver={(e) => {
                    if (dragIndexRef.current === null) return;
                    e.preventDefault();
                    setDragOverIndex(headerIdx);
                  }}
                  onDrop={(e) => {
                    if (dragIndexRef.current === null) return;
                    e.preventDefault();
                    const from = dragIndexRef.current;
                    const to = headerIdx;
                    if (from !== null && from !== to) reorderDisplayFields(from, to);
                    dragIndexRef.current = null;
                    setDragOverIndex(null);
                  }}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {/* Grip icon for drag reorder */}
                    <button
                      type="button"
                      aria-label={`Reorder ${field.name?.en || field.id}`}
                      className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded text-gray-300 hover:text-gray-500 cursor-grab"
                      draggable
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      onDragStart={(e) => {
                        dragIndexRef.current = headerIdx;
                        setDragOverIndex(headerIdx);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => {
                        dragIndexRef.current = null;
                        setDragOverIndex(null);
                      }}
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <circle cx="7" cy="5" r="1.3" />
                        <circle cx="13" cy="5" r="1.3" />
                        <circle cx="7" cy="10" r="1.3" />
                        <circle cx="13" cy="10" r="1.3" />
                        <circle cx="7" cy="15" r="1.3" />
                        <circle cx="13" cy="15" r="1.3" />
                      </svg>
                    </button>

                    <span className={`flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${FIELD_TYPE_COLORS[field.type] || 'bg-gray-100 text-gray-600'}`}>
                      {FIELD_TYPE_ICONS[field.type] || '?'}
                    </span>
                    <span className="truncate">{field.name?.en || field.id}</span>
                    <span className="flex-shrink-0 text-green-600 font-semibold">{getSortIndicator(field.id)}</span>
                  </div>

                  {/* Resize handle */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-green-400/40 transition-colors z-10"
                    onMouseDown={(e) => handleResizeMouseDown(e, field.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && !error && (
              <tr>
                <td colSpan={displayFields.length} className="px-4 py-8 text-center text-sm text-gray-400">
                  No data returned. Try different fields or filters.
                </td>
              </tr>
            )}

            {loading && rows.length === 0 &&
              Array.from({ length: 5 }).map((_, rowIdx) => (
                <tr key={`shimmer-${rowIdx}`} className="border-b border-gray-100">
                  {displayFields.map((field) => (
                    <td key={field.id} className="px-4 py-3">
                      <div className={`h-4 rounded ${rowIdx % 3 === 0 ? 'w-24' : rowIdx % 3 === 1 ? 'w-32' : 'w-20'} bg-gray-100 animate-pulse`} />
                    </td>
                  ))}
                </tr>
              ))}

            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                {displayFields.map((field) => {
                  const colIdx = columnIndexMap.get(field.id);
                  const value = colIdx !== undefined ? row[colIdx] : null;
                  return (
                    <td key={field.id} className="px-4 py-2.5 whitespace-nowrap text-left truncate">
                      {formatCellValue(value, field)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 bg-gray-50/80 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
        <span>
          {selectedFields.length} columns · {rows.length} row{rows.length !== 1 ? 's' : ''}
          {rows.length >= 100 && ' (limited to 100)'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${loading ? 'bg-blue-400 animate-pulse' : error ? 'bg-red-400' : 'bg-green-500'}`} />
          {loading ? 'Querying...' : error ? 'Error' : 'Connected'}
        </span>
      </div>
    </div>
  );
}
