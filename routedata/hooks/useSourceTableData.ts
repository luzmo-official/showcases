'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { FieldMetadata, Sort } from '@/lib/types';
import { getApiHost } from '@/lib/services/luzmo-service';

interface QueryDimension {
  column_id: string;
  dataset_id: string;
  level?: number;
}

interface QueryMeasure {
  column_id: string;
  dataset_id: string;
  aggregation: { type: string };
}

interface QueryOrder {
  column_id: string;
  dataset_id: string;
  order: 'asc' | 'desc';
}

interface UseSourceTableDataReturn {
  rows: unknown[][];
  loading: boolean;
  error: string | null;
  fieldOrder: FieldMetadata[];
  refresh: () => void;
}

const ROWS_LIMIT = 100;

function buildQuery(
  fields: FieldMetadata[],
  datasetId: string,
  sorts: Sort[]
) {
  const dimensions: QueryDimension[] = [];
  const measures: QueryMeasure[] = [];
  const fieldOrder: FieldMetadata[] = [];

  for (const field of fields) {
    if (field.type === 'numeric') {
      measures.push({
        column_id: field.id,
        dataset_id: datasetId,
        aggregation: { type: 'sum' },
      });
    } else if (field.type === 'datetime') {
      dimensions.push({
        column_id: field.id,
        dataset_id: datasetId,
        level: field.lowestLevel ?? 5,
      });
    } else if (field.type === 'hierarchy') {
      dimensions.push({
        column_id: field.id,
        dataset_id: datasetId,
        level: field.lowestLevel ?? 1,
      });
    } else {
      dimensions.push({
        column_id: field.id,
        dataset_id: datasetId,
      });
    }
  }

  // Maintain the original field order for mapping data columns back
  // Data comes back as: [dim0, dim1, ..., measure0, measure1, ...]
  const dimFields = fields.filter((f) => f.type !== 'numeric');
  const measureFields = fields.filter((f) => f.type === 'numeric');
  fieldOrder.push(...dimFields, ...measureFields);

  const order: QueryOrder[] = sorts.map((s) => ({
    column_id: s.fieldId,
    dataset_id: s.datasetId,
    order: s.direction,
  }));

  return { dimensions, measures, order, fieldOrder };
}

export function useSourceTableData(
  authKey: string,
  authToken: string,
  datasetId: string,
  selectedFields: FieldMetadata[],
  sorts: Sort[]
): UseSourceTableDataReturn {
  const [rows, setRows] = useState<unknown[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldOrder, setFieldOrder] = useState<FieldMetadata[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!authKey || !authToken || !datasetId || selectedFields.length === 0) {
      setRows([]);
      setFieldOrder([]);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const { dimensions, measures, order, fieldOrder: fo } = buildQuery(
        selectedFields,
        datasetId,
        sorts
      );

      setFieldOrder(fo);

      const body = {
        key: authKey,
        token: authToken,
        version: '0.1.0',
        action: 'get',
        find: {
          queries: [
            {
              dimensions,
              measures,
              ...(order.length > 0 ? { order } : {}),
              limit: { by: ROWS_LIMIT, offset: 0 },
            },
          ],
        },
      };

      const res = await fetch(`${getApiHost()}/0.1.0/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Luzmo API returned ${res.status}: ${text}`);
      }

      const json = await res.json();

      // Response shape: { data: [ { data: [[...], ...], performance: {...} } ] }
      // or sometimes just { data: [[...], ...] }
      let resultRows: unknown[][] = [];
      if (Array.isArray(json.data)) {
        if (json.data.length > 0 && Array.isArray(json.data[0]?.data)) {
          resultRows = json.data[0].data;
        } else if (json.data.length > 0 && Array.isArray(json.data[0])) {
          resultRows = json.data;
        }
      }

      if (!controller.signal.aborted) {
        setRows(resultRows);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Source table query failed:', err);
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Query failed');
        setRows([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [authKey, authToken, datasetId, selectedFields, sorts]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off async data fetch on field/sort change
    fetchData();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { rows, loading, error, fieldOrder, refresh };
}
