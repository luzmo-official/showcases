'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { loadDataFieldsForDatasets } from '@luzmo/analytics-components-kit/utils';
import type { FieldMetadata } from '@/lib/types';
import { getApiHost } from '@/lib/services/luzmo-service';
import { StackLabelBadge } from '@/components/dev/StackLabelBadge';

const FIELD_CATALOG_BADGE = {
  label: 'loadDataFieldsForDatasets',
  description: 'Fetches dataset columns through the ACK data broker so you can pick source-table fields.',
  title:
    '@luzmo/analytics-components-kit/utils — REST field catalog (no web component on this surface). Uses embed auth.',
  variant: 'utils' as const,
  position: 'top-right' as const,
};

interface FieldSelectorProps {
  authKey: string;
  authToken: string;
  datasetId: string;
  selectedFieldIds: string[];
  onSelectionChanged: (fields: FieldMetadata[]) => void;
  onDatasetNameResolved?: (name: string) => void;
}

interface DataField {
  columnId?: string;
  formulaId?: string;
  name: Record<string, string>;
  description?: Record<string, string>;
  type: string;
  subtype?: string;
  format?: string;
  lowestLevel?: number;
  highestLevel?: number;
  hierarchy_enabled?: boolean;
  hierarchyLevels?: Array<{ id: string; level: number; name: Record<string, string> }>;
  expression?: string;
  datasetId: string;
  /** ACK sometimes exposes default drill level here when `lowestLevel` is absent */
  level?: number;
}

const TYPE_CONFIG: Record<string, { icon: string; label: string; chipSelected: string; chipDefault: string }> = {
  numeric: { icon: '#', label: 'Numeric', chipSelected: 'bg-blue-100 text-blue-800 ring-blue-300', chipDefault: 'bg-white text-gray-600 ring-gray-200 hover:ring-blue-200 hover:bg-blue-50' },
  datetime: { icon: '⏱', label: 'DateTime', chipSelected: 'bg-purple-100 text-purple-800 ring-purple-300', chipDefault: 'bg-white text-gray-600 ring-gray-200 hover:ring-purple-200 hover:bg-purple-50' },
  hierarchy: { icon: 'Aa', label: 'Text', chipSelected: 'bg-green-100 text-green-800 ring-green-300', chipDefault: 'bg-white text-gray-600 ring-gray-200 hover:ring-green-200 hover:bg-green-50' },
  spatial: { icon: '📍', label: 'Spatial', chipSelected: 'bg-orange-100 text-orange-800 ring-orange-300', chipDefault: 'bg-white text-gray-600 ring-gray-200 hover:ring-orange-200 hover:bg-orange-50' },
};

const COLUMN_GROUPS: Array<{ key: string; label: string; keywords: string[] }> = [
  { key: 'shipments', label: 'Shipments', keywords: ['shipment', 'order', 'consignment', 'parcel', 'volume', 'weight'] },
  { key: 'carriers', label: 'Carriers', keywords: ['carrier', 'provider', '3pl'] },
  { key: 'routes', label: 'Routes', keywords: ['route', 'lane', 'origin', 'destination', 'country', 'region', 'city'] },
  { key: 'warehouses', label: 'Warehouses', keywords: ['warehouse', 'dock', 'fulfillment', 'distribution'] },
  { key: 'delivery-performance', label: 'Delivery Performance', keywords: ['delivery', 'delay', 'late', 'on-time', 'sla', 'exception', 'reliability'] },
  { key: 'cost-volume', label: 'Cost & Volume', keywords: ['cost', 'price', 'freight', 'shipment cost', 'throughput', 'utilization'] },
  { key: 'time', label: 'Time', keywords: ['date', 'time', 'week', 'month', 'quarter', 'year', 'promised'] },
];

function dataFieldToFieldMetadata(df: DataField): FieldMetadata {
  return {
    id: df.columnId || df.formulaId || '',
    name: df.name,
    description: df.description,
    type: df.type as FieldMetadata['type'],
    subtype: df.subtype,
    format: df.format,
    lowestLevel: df.lowestLevel ?? df.level,
    highestLevel: df.highestLevel,
    hierarchy_enabled: df.hierarchy_enabled,
    hierarchyLevels: df.hierarchyLevels,
    expression: df.expression,
  };
}

function getFieldGroup(field: FieldMetadata): string {
  const name = `${field.name?.en || ''} ${field.description?.en || ''}`.toLowerCase();
  for (const group of COLUMN_GROUPS) {
    if (group.keywords.some((kw) => name.includes(kw))) return group.label;
  }
  if (field.type === 'datetime') return 'Time';
  return 'Other';
}

export function FieldSelector({
  authKey,
  authToken,
  datasetId,
  selectedFieldIds,
  onSelectionChanged,
  onDatasetNameResolved,
}: FieldSelectorProps) {
  const [allFields, setAllFields] = useState<FieldMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const onDatasetNameResolvedRef = useRef(onDatasetNameResolved);
  useEffect(() => {
    onDatasetNameResolvedRef.current = onDatasetNameResolved;
  });

  useEffect(() => {
    if (!authKey || !authToken || !datasetId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear loading when auth/dataset is absent
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const datasets = await loadDataFieldsForDatasets([datasetId.trim()], {
          dataBrokerConfig: {
            apiUrl: getApiHost(),
            authKey,
            authToken,
          },
        });

        if (cancelled) return;

        if (datasets && datasets.length > 0) {
          const ds = datasets[0];
          if (onDatasetNameResolvedRef.current && ds.name?.en) {
            onDatasetNameResolvedRef.current(ds.name.en);
          }

          const fields: FieldMetadata[] = (ds.dataFields || [])
            .map((df: DataField) => dataFieldToFieldMetadata(df))
            .filter((f: FieldMetadata) => f.id);

          setAllFields(fields);
        } else {
          setAllFields([]);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to fetch dataset fields:', err);
        setError(err instanceof Error ? err.message : 'Failed to load fields');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authKey, authToken, datasetId]);

  const filteredFields = useMemo(() => {
    if (!searchQuery.trim()) return allFields;
    const q = searchQuery.toLowerCase();
    return allFields.filter(
      (f) =>
        (f.name?.en || '').toLowerCase().includes(q) ||
        (f.description?.en || '').toLowerCase().includes(q) ||
        f.type.toLowerCase().includes(q)
    );
  }, [allFields, searchQuery]);

  const selectedSet = useMemo(() => new Set(selectedFieldIds), [selectedFieldIds]);
  const selectedFieldsOrdered = useMemo(() => {
    const byId = new Map(allFields.map((f) => [f.id, f]));
    return selectedFieldIds.map((id) => byId.get(id)).filter(Boolean) as FieldMetadata[];
  }, [allFields, selectedFieldIds]);

  const toggleField = useCallback(
    (field: FieldMetadata) => {
      const isSelected = selectedSet.has(field.id);
      let nextFields: FieldMetadata[];
      const currentSelected = selectedFieldsOrdered;
      if (isSelected) {
        nextFields = currentSelected.filter((f) => f.id !== field.id);
      } else {
        nextFields = [...currentSelected, field];
      }
      onSelectionChanged(nextFields);
    },
    [selectedFieldsOrdered, selectedSet, onSelectionChanged]
  );

  const selectAll = useCallback(() => {
    onSelectionChanged([...filteredFields]);
  }, [filteredFields, onSelectionChanged]);

  const clearAll = useCallback(() => {
    onSelectionChanged([]);
  }, [onSelectionChanged]);

  const groupedFields = useMemo(() => {
    const groups: Record<string, FieldMetadata[]> = {};
    for (const f of filteredFields) {
      const key = getFieldGroup(f);
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    }
    return groups;
  }, [filteredFields]);

  const groupedFieldEntries = useMemo(() => {
    const preferredOrder = [...COLUMN_GROUPS.map((g) => g.label), 'Other'];
    const entries = Object.entries(groupedFields);
    entries.sort((a, b) => {
      const ai = preferredOrder.indexOf(a[0]);
      const bi = preferredOrder.indexOf(b[0]);
      const an = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
      const bn = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
      if (an !== bn) return an - bn;
      return a[0].localeCompare(b[0]);
    });
    return entries;
  }, [groupedFields]);

  if (loading) {
    return (
      <StackLabelBadge {...FIELD_CATALOG_BADGE}>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          <span className="ml-2 text-sm text-gray-400">Loading fields...</span>
        </div>
      </StackLabelBadge>
    );
  }

  if (error) {
    return (
      <StackLabelBadge {...FIELD_CATALOG_BADGE}>
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-xs text-red-600 font-medium">Failed to load fields</p>
          <p className="text-[11px] text-red-500 mt-0.5">{error}</p>
        </div>
      </StackLabelBadge>
    );
  }

  if (allFields.length === 0) {
    return (
      <StackLabelBadge {...FIELD_CATALOG_BADGE}>
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-gray-400">No fields available in this dataset.</p>
        </div>
      </StackLabelBadge>
    );
  }

  return (
    <StackLabelBadge {...FIELD_CATALOG_BADGE}>
    <div className="space-y-3">
      {/* Top row: search + actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter fields..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-colors"
          />
        </div>
        <span className="text-xs text-gray-500">
          <span className="font-bold text-green-600">{selectedFieldIds.length}</span>/{allFields.length}
        </span>
        <button onClick={selectAll} className="text-[11px] font-medium text-green-600 hover:text-green-700 hover:underline">All</button>
        <button onClick={clearAll} className="text-[11px] font-medium text-gray-400 hover:text-gray-600 hover:underline">Clear</button>
      </div>

      {/* Selected order (drag to reorder) */}
      {selectedFieldsOrdered.length > 0 && (
        <div className="bg-gray-50/40 border border-gray-200 rounded-xl px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Column order</span>
              <span className="text-[10px] text-gray-400">Drag to reorder</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {selectedFieldsOrdered.map((field, idx) => {
              const config =
                TYPE_CONFIG[field.type] || {
                  icon: '?',
                  label: field.type,
                  chipSelected: 'bg-gray-200 text-gray-800 ring-gray-300',
                  chipDefault: 'bg-white text-gray-600 ring-gray-200',
                };
              const isOver = dragOverIndex === idx;

              return (
                <div
                  key={field.id}
                  draggable
                  onDragStart={(e) => {
                    dragIndexRef.current = idx;
                    setDragOverIndex(idx);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnter={() => setDragOverIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = dragIndexRef.current;
                    if (from === null || from === idx) return;
                    const next = [...selectedFieldsOrdered];
                    const [moved] = next.splice(from, 1);
                    next.splice(idx, 0, moved);
                    dragIndexRef.current = null;
                    setDragOverIndex(null);
                    onSelectionChanged(next);
                  }}
                  onDragEnd={() => {
                    dragIndexRef.current = null;
                    setDragOverIndex(null);
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ring-1 transition-all cursor-grab select-none ${
                    isOver ? 'bg-green-50 ring-green-300' : 'bg-white ring-gray-200'
                  }`}
                  title={field.name?.en || field.id}
                >
                  <span className="text-[10px] opacity-60">{config.icon}</span>
                  <span className="text-[12px] font-medium text-gray-800 truncate max-w-[160px]">
                    {field.name?.en || field.id}
                  </span>

                  {/* Remove from selection */}
                  <button
                    type="button"
                    onClick={() => toggleField(field)}
                    className="ml-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    aria-label={`Remove ${field.name?.en || field.id}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Compact horizontal category cards with all fields visible. */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {groupedFieldEntries.map(([groupName, fields]) => {
          const selectedInGroup = fields.filter((f) => selectedSet.has(f.id)).length;
          return (
            <div
              key={groupName}
              className="shrink-0 w-56 rounded-lg border border-gray-200 bg-white overflow-hidden"
            >
              <div className="w-full flex items-center justify-between px-2.5 py-2 text-left bg-gray-50/70 border-b border-gray-100">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">{groupName}</span>
                  <span className="text-[10px] text-gray-300">({fields.length})</span>
                </div>
                <span
                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                    selectedInGroup > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {selectedInGroup}
                </span>
              </div>
              <div className="px-2.5 pb-2 max-h-40 overflow-y-auto">
                <div className="flex flex-wrap gap-1 pt-2">
                  {fields.map((field) => {
                    const isSelected = selectedSet.has(field.id);
                    const config = TYPE_CONFIG[field.type] || { icon: '?', label: field.type, chipSelected: 'bg-gray-200 text-gray-800 ring-gray-300', chipDefault: 'bg-white text-gray-600 ring-gray-200' };
                    return (
                      <button
                        key={field.id}
                        onClick={() => toggleField(field)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ring-1 transition-all ${
                          isSelected ? config.chipSelected : config.chipDefault
                        }`}
                      >
                        <span className="text-[9px] opacity-60">{config.icon}</span>
                        <span className="truncate max-w-[140px]">{field.name?.en || field.id}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredFields.length === 0 && searchQuery && (
        <p className="text-xs text-gray-400 text-center py-4">No fields match &quot;{searchQuery}&quot;</p>
      )}

      {groupedFieldEntries.length > 0 && (
        <p className="text-[10px] text-gray-400">
          All available source columns are shown by category for quick selection.
        </p>
      )}
    </div>
    </StackLabelBadge>
  );
}
