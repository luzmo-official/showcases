'use client';

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import '@luzmo/analytics-components-kit/item-slot-drop-panel';
import '@luzmo/analytics-components-kit/item-slot-picker-panel';
import { getApiHost } from '@/lib/services/luzmo-service';
import type { FieldMetadata } from '@/lib/types';
import { buildWorkbookDatasetsDataFields } from '@/lib/luzmo/workbook-dataset-fields';
import { StackLabelBadge } from '@/components/dev/StackLabelBadge';

const SLOT_PICKER_PLACEHOLDER = 'Select Field';

interface ChartConfigPanelProps {
  authKey: string;
  authToken: string;
  datasetId: string;
  itemType: string;
  slotsContents: unknown[];
  onSlotsContentsChanged: (slotsContents: unknown[]) => void;
  mode?: 'drag-drop' | 'picker';
  /** Limit slot pickers to these columns (workbook data step). Uses ACK `datasetsDataFields`. */
  restrictToFields?: FieldMetadata[];
  datasetName?: string;
  onDatasetChanged?: (datasetId: string) => void;
}

function applySlotPickerPlaceholders(panelEl: HTMLElement) {
  const shadow = panelEl.shadowRoot;
  if (!shadow) return;
  shadow.querySelectorAll('luzmo-item-slot-picker').forEach((picker) => {
    try {
      (picker as HTMLElement & { placeholder?: string }).placeholder = SLOT_PICKER_PLACEHOLDER;
    } catch {
      /* ignore */
    }
  });
}

export function ChartConfigPanel({
  authKey,
  authToken,
  datasetId,
  itemType,
  slotsContents,
  onSlotsContentsChanged,
  mode = 'drag-drop',
  restrictToFields,
  datasetName,
  onDatasetChanged,
}: ChartConfigPanelProps) {
  const ref = useRef<HTMLElement>(null);

  const restrictedData = useMemo(
    () =>
      mode === 'picker'
        ? buildWorkbookDatasetsDataFields(datasetId, datasetName, restrictToFields)
        : null,
    [mode, datasetId, datasetName, restrictToFields]
  );

  const schedulePlaceholderSync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    applySlotPickerPlaceholders(el);
    window.setTimeout(() => applySlotPickerPlaceholders(el), 50);
    window.setTimeout(() => applySlotPickerPlaceholders(el), 300);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    type PanelElement = HTMLElement & {
      slotsContents?: unknown[];
      datasetIds?: string[];
      datasetsDataFields?: unknown;
      selectedDatasetId?: string;
    };

    const element = el as PanelElement;

    if (mode === 'picker' && restrictedData) {
      element.datasetsDataFields = restrictedData;
      element.selectedDatasetId = datasetId;
      element.datasetIds = [];
    } else {
      element.datasetIds = [datasetId];
      delete element.datasetsDataFields;
      delete element.selectedDatasetId;
    }

    const handleSlotsContentsChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ slotsContents?: unknown[] }>;
      const newSlotsContents = customEvent.detail?.slotsContents ?? [];
      onSlotsContentsChanged(newSlotsContents);
    };

    const handleDatasetChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ datasetId?: string }>;
      const next = customEvent.detail?.datasetId;
      if (next && onDatasetChanged) onDatasetChanged(next);
    };

    el.addEventListener('luzmo-slots-contents-changed', handleSlotsContentsChanged);
    if (mode === 'picker') {
      el.addEventListener('luzmo-dataset-changed', handleDatasetChanged);
    }

    return () => {
      el.removeEventListener('luzmo-slots-contents-changed', handleSlotsContentsChanged);
      if (mode === 'picker') {
        el.removeEventListener('luzmo-dataset-changed', handleDatasetChanged);
      }
    };
  }, [datasetId, mode, onDatasetChanged, onSlotsContentsChanged, restrictedData]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    (el as HTMLElement & { slotsContents?: unknown[] }).slotsContents = slotsContents;
  }, [slotsContents]);

  /** ACK defaults to msg("Select..."); set placeholder on nested slot pickers when the panel renders. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    schedulePlaceholderSync();
    const sr = el.shadowRoot;
    const obs =
      sr &&
      new MutationObserver(() => {
        schedulePlaceholderSync();
      });
    if (sr && obs) {
      obs.observe(sr, { childList: true, subtree: true });
    }
    return () => obs?.disconnect();
  }, [itemType, slotsContents, mode, schedulePlaceholderSync]);

  const commonProps = {
    ref,
    'auth-key': authKey,
    'auth-token': authToken,
    'api-url': getApiHost(),
    'item-type': itemType,
    language: 'en',
    size: 'm',
  };

  const ackLabel =
    mode === 'picker' ? 'luzmo-item-slot-picker-panel' : 'luzmo-item-slot-drop-panel';
  const slotDescription =
    mode === 'picker'
      ? 'Pick measures and dimensions from a structured slot UI when datasets are pre-scoped.'
      : 'Drag fields onto chart slots (axes, measures, legend) to define the Flex item’s data mapping.';

  return (
    <StackLabelBadge
      className="rounded-xl border-0 bg-transparent p-0 shadow-none"
      label={ackLabel}
      description={slotDescription}
      title="Luzmo Analytics Components Kit — chart slot configuration (drop vs picker mode)"
    >
      {mode === 'drag-drop' ? (
        <luzmo-item-slot-drop-panel {...commonProps} />
      ) : (
        <luzmo-item-slot-picker-panel
          {...commonProps}
          dataset-picker={restrictedData ? undefined : true}
          grows
        />
      )}
    </StackLabelBadge>
  );
}
