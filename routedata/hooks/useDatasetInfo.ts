'use client';

import { useEffect, useState } from 'react';
import { LUZMO_API_HOST, LUZMO_DATASET_ID, LUZMO_EMBED_KEY, LUZMO_EMBED_TOKEN } from '@/lib/luzmo/config';

export interface DatasetColumnInfo {
  id: string;
  name: string;
  type: string;
  subtype: string | null;
}

export interface DatasetSummary {
  id: string;
  name: string;
  totalRows: number;
  columns: DatasetColumnInfo[];
}

interface LuzmoColumn {
  id: string;
  name: Record<string, string>;
  type: string;
  subtype: string | null;
}

interface SecurableResponse {
  rows?: Array<{ id: string; name: Record<string, string>; columns: LuzmoColumn[] }>;
}

interface DataResponse {
  data?: unknown[][];
}

/** Fetches dataset metadata + row count directly from Luzmo using the hardcoded embed key/token. */
export function useDatasetInfo() {
  const [dataset, setDataset] = useState<DatasetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const metaRes = await fetch(`${LUZMO_API_HOST}/0.1.0/securable`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: LUZMO_EMBED_KEY,
            token: LUZMO_EMBED_TOKEN,
            version: '0.1.0',
            action: 'get',
            find: {
              where: { id: LUZMO_DATASET_ID },
              attributes: ['id', 'name'],
              include: [
                {
                  model: 'Column',
                  attributes: ['id', 'name', 'type', 'subtype'],
                },
              ],
            },
          }),
        });
        if (!metaRes.ok) throw new Error(`Dataset metadata failed: ${metaRes.status}`);
        const metaJson = (await metaRes.json()) as SecurableResponse;
        const ds = metaJson.rows?.[0];
        if (!ds) throw new Error('Dataset not found');

        const firstColId = ds.columns?.[0]?.id;
        let totalRows = 0;
        if (firstColId) {
          const countRes = await fetch(`${LUZMO_API_HOST}/0.1.0/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key: LUZMO_EMBED_KEY,
              token: LUZMO_EMBED_TOKEN,
              version: '0.1.0',
              action: 'get',
              find: {
                queries: [
                  {
                    dimensions: [],
                    measures: [
                      {
                        column_id: firstColId,
                        dataset_id: LUZMO_DATASET_ID,
                        aggregation: { type: 'count' },
                      },
                    ],
                  },
                ],
              },
            }),
          });
          if (countRes.ok) {
            const countJson = (await countRes.json()) as DataResponse;
            const v = countJson.data?.[0]?.[0];
            totalRows = typeof v === 'number' ? v : 0;
          }
        }

        if (cancelled) return;

        setDataset({
          id: ds.id,
          name: ds.name?.en ?? Object.values(ds.name ?? {})[0] ?? 'Unnamed Dataset',
          totalRows,
          columns: ds.columns.map((c) => ({
            id: c.id,
            name: c.name?.en ?? Object.values(c.name ?? {})[0] ?? 'Unnamed',
            type: c.type,
            subtype: c.subtype,
          })),
        });
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load dataset info');
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { dataset, loading, error };
}
