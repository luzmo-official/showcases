'use client';

import React, { useRef, useEffect } from 'react';
import '@luzmo/analytics-components-kit/filters';
import { getApiHost } from '@/lib/services/luzmo-service';
import { StackLabelBadge } from '@/components/dev/StackLabelBadge';
import type { FieldMetadata } from '@/lib/types';

type LuzmoFiltersElement = HTMLElement & {
  datasetIds?: string[];
  filters?: unknown[];
};

interface FiltersPanelProps {
  authKey: string;
  authToken: string;
  datasetId: string;
  filters: unknown[];
  availableFields?: FieldMetadata[];
  onFiltersChanged: (filters: unknown[]) => void;
}

export function FiltersPanel({
  authKey,
  authToken,
  datasetId,
  filters,
  availableFields = [],
  onFiltersChanged,
}: FiltersPanelProps) {
  const ref = useRef<LuzmoFiltersElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.datasetIds = [datasetId];
    el.filters = filters;

    const handleFiltersChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ filters: unknown[] }>;
      const newFilters = customEvent.detail?.filters;
      if (newFilters !== undefined) {
        onFiltersChanged(newFilters);
      }
    };

    el.addEventListener('luzmo-filters-changed', handleFiltersChanged);
    return () => {
      el.removeEventListener('luzmo-filters-changed', handleFiltersChanged);
    };
  }, [datasetId, filters, onFiltersChanged]);

  if (!datasetId) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
        Select a dataset to configure filters
      </div>
    );
  }

  return (
    <StackLabelBadge
      className="rounded-lg border border-gray-200 bg-white p-4 space-y-3"
      label="luzmo-filters"
      description="Builds Luzmo filter payloads that apply to workbook charts and the grid."
      title="Luzmo Analytics Components Kit — luzmo-filters"
    >
      {availableFields.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Source Table Fields ({availableFields.length})
          </p>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {availableFields.map((f) => (
              <span
                key={f.id}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-gray-50 border border-gray-200 text-gray-600"
                title={f.id}
              >
                {f.name?.en || f.id}
              </span>
            ))}
          </div>
        </div>
      )}
      <luzmo-filters
        ref={ref}
        auth-key={authKey}
        auth-token={authToken}
        api-url={getApiHost()}
        language="en"
        size="m"
      />
      <p className="text-[10px] text-gray-400">
        No filters are applied by default. Add filters as needed in the editor.
      </p>
    </StackLabelBadge>
  );
}
