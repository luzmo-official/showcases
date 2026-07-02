'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import '@luzmo/analytics-components-kit/data-field-panel';
import type { FieldMetadata } from '@/lib/types';
import { getApiHost } from '@/lib/services/luzmo-service';
import {
  buildWorkbookDatasetsDataFields,
  type WorkbookDatasetsDataFieldsEntry,
} from '@/lib/luzmo/workbook-dataset-fields';
import { StackLabelBadge } from '@/components/dev/StackLabelBadge';

interface DataFieldsPanelProps {
  authKey: string;
  authToken: string;
  datasetId: string;
  datasetName?: string;
  restrictToFields?: FieldMetadata[];
  onDatasetChanged?: (datasetId: string) => void;
}

export function DataFieldsPanel({
  authKey,
  authToken,
  datasetId,
  datasetName,
  restrictToFields,
  onDatasetChanged,
}: DataFieldsPanelProps) {
  const ref = useRef<HTMLElement>(null);

  const restrictedData = useMemo(
    () => buildWorkbookDatasetsDataFields(datasetId, datasetName, restrictToFields),
    [restrictToFields, datasetId, datasetName]
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    type PanelElement = HTMLElement & {
      datasetIds?: string[];
      datasetsDataFields?: WorkbookDatasetsDataFieldsEntry[];
    };

    if (restrictedData) {
      (el as PanelElement).datasetsDataFields = restrictedData;
      delete (el as PanelElement).datasetIds;
    } else {
      (el as PanelElement).datasetIds = [datasetId];
      delete (el as PanelElement).datasetsDataFields;
    }

    const handleDatasetChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ datasetId?: string }>;
      const newDatasetId = customEvent.detail?.datasetId;
      if (newDatasetId && onDatasetChanged) {
        onDatasetChanged(newDatasetId);
      }
    };

    el.addEventListener('luzmo-dataset-changed', handleDatasetChanged);
    return () => {
      el.removeEventListener('luzmo-dataset-changed', handleDatasetChanged);
    };
  }, [datasetId, onDatasetChanged, restrictedData]);

  return (
    <div className="h-full overflow-auto">
      <StackLabelBadge
        label="luzmo-data-field-panel"
        description="Browse and search dataset fields with ACK’s native field browser (optional embed surface)."
        title="@luzmo/analytics-components-kit — luzmo-data-field-panel"
        className="h-full"
      >
        <luzmo-data-field-panel
          ref={ref}
          auth-key={authKey}
          auth-token={authToken}
          api-url={getApiHost()}
          language="en"
          size="m"
          dataset-picker={restrictedData ? undefined : true}
          search="auto"
        />
      </StackLabelBadge>
    </div>
  );
}
