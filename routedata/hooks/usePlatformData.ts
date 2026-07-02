'use client';

import { useEffect, useState } from 'react';
import { KPI_COLUMN_IDS as COL } from '@/lib/domain/kpi-columns';
import { LUZMO_API_HOST, LUZMO_DATASET_ID, LUZMO_EMBED_KEY, LUZMO_EMBED_TOKEN } from '@/lib/luzmo/config';

export interface KPIs {
  onTimeDeliveryPct: number;
  avgDeliveryDelay: number;
  costPerShipment: number;
  carrierReliability: number;
  deliveryTrend: number;
  delayTrend: number;
  costTrend: number;
}

export interface Target {
  name: string;
  metric: string;
  current: number;
  target: number;
  unit: string;
  year: number;
  progress: number;
}

export interface DatasetInfo {
  name: string;
  id: string;
  totalRows: number;
  columns: number;
}

export interface PlatformData {
  kpis: KPIs;
  targets: Target[];
  dataset: DatasetInfo;
}

interface LuzmoDataResponse {
  data?: unknown[][];
  error?: { message?: string };
}

interface LuzmoSecurableResponse {
  rows?: Array<{ id: string; name: Record<string, string>; columns: unknown[] }>;
}

function measure(colId: string, agg: string) {
  return { column_id: colId, dataset_id: LUZMO_DATASET_ID, aggregation: { type: agg } };
}

async function postLuzmo<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${LUZMO_API_HOST}/0.1.0/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: LUZMO_EMBED_KEY,
      token: LUZMO_EMBED_TOKEN,
      version: '0.1.0',
      ...body,
    }),
  });
  if (!res.ok) throw new Error(`Luzmo ${path} returned ${res.status}`);
  return (await res.json()) as T;
}

function unwrapNumber(val: unknown): number {
  return typeof val === 'number' ? val : 0;
}

function avgOfCol(rows: unknown[][], colIdx: number): number {
  if (rows.length === 0) return 0;
  const sum = rows.reduce((a, r) => a + unwrapNumber(r[colIdx]), 0);
  return sum / rows.length;
}

/** Fetches aggregate KPIs + target progress + dataset metadata in three parallel browser calls. */
export function usePlatformData() {
  const [data, setData] = useState<PlatformData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [aggregates, timeseries, securable] = await Promise.all([
          postLuzmo<LuzmoDataResponse>('data', {
            action: 'get',
            find: {
              queries: [
                {
                  dimensions: [],
                  measures: [
                    measure(COL.onTimeDeliveryPct, 'average'),
                    measure(COL.avgDeliveryDelay, 'average'),
                    measure(COL.costPerShipment, 'average'),
                    measure(COL.exceptionRate, 'average'),
                    measure(COL.dockUtilization, 'average'),
                    measure(COL.throughput, 'average'),
                    measure(COL.slaTarget, 'average'),
                  ],
                },
              ],
            },
          }),
          postLuzmo<LuzmoDataResponse>('data', {
            action: 'get',
            find: {
              queries: [
                {
                  dimensions: [{ column_id: COL.date, dataset_id: LUZMO_DATASET_ID, level: 5 }],
                  measures: [
                    measure(COL.onTimeDeliveryPct, 'sum'),
                    measure(COL.avgDeliveryDelay, 'sum'),
                    measure(COL.costPerShipment, 'sum'),
                  ],
                  order: [{ column_id: COL.date, dataset_id: LUZMO_DATASET_ID, order: 'desc' }],
                  limit: { by: 200, offset: 0 },
                },
              ],
            },
          }),
          postLuzmo<LuzmoSecurableResponse>('securable', {
            action: 'get',
            find: {
              where: { id: LUZMO_DATASET_ID },
              attributes: ['id', 'name'],
              include: [{ model: 'Column', attributes: ['id'] }],
            },
          }),
        ]);

        const agg = aggregates.data?.[0] ?? [];
        const onTimeDeliveryPct = unwrapNumber(agg[0]);
        const avgDeliveryDelay = unwrapNumber(agg[1]);
        const costPerShipment = unwrapNumber(agg[2]);
        const exceptionRate = unwrapNumber(agg[3]);
        const dockUtilization = unwrapNumber(agg[4]);
        const throughput = unwrapNumber(agg[5]);
        const slaTarget = unwrapNumber(agg[6]);

        const ts = timeseries.data ?? [];
        const recent = ts.slice(0, Math.floor(ts.length / 2));
        const older = ts.slice(Math.floor(ts.length / 2));
        const deliveryTrend = trendPct(avgOfCol(recent, 1), avgOfCol(older, 1));
        const delayTrend = trendPct(avgOfCol(recent, 2), avgOfCol(older, 2));
        const costTrend = trendPct(avgOfCol(recent, 3), avgOfCol(older, 3));

        const dataset = securable.rows?.[0];
        const datasetName = dataset?.name?.en ?? Object.values(dataset?.name ?? {})[0] ?? 'Logistics Dataset';
        const columnCount = dataset?.columns?.length ?? 0;

        if (cancelled) return;

        setData({
          kpis: {
            onTimeDeliveryPct: onTimeDeliveryPct * 100,
            avgDeliveryDelay,
            costPerShipment,
            carrierReliability: onTimeDeliveryPct * 100,
            deliveryTrend: Math.round(deliveryTrend),
            delayTrend: Math.round(delayTrend),
            costTrend: Math.round(costTrend),
          },
          targets: [
            buildTarget('On-Time Delivery', 'On-time deliveries against SLA target', onTimeDeliveryPct * 100, 95, '%'),
            buildTarget('Average Delivery Delay', 'Delay threshold against promise date', avgDeliveryDelay, 2, 'days', true),
            buildTarget('Dock Utilization', 'Average dock utilization rate', dockUtilization * 100, 85, '%'),
            buildTarget('Warehouse Throughput', 'Processed shipment volume', throughput, 500, '/day'),
            buildTarget('SLA Target', 'Mean SLA target across lanes', slaTarget, 95, '%'),
            buildTarget('Exception Rate', 'Share of shipments flagged as exceptions', exceptionRate * 100, 10, '%', true),
          ],
          dataset: {
            name: datasetName,
            id: LUZMO_DATASET_ID,
            totalRows: 0,
            columns: columnCount,
          },
        });
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load platform data');
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}

function trendPct(recent: number, older: number): number {
  if (older <= 0) return 0;
  return ((recent - older) / older) * 100;
}

function buildTarget(
  name: string,
  metric: string,
  current: number,
  target: number,
  unit: string,
  lowerIsBetter = false
): Target {
  const rounded = Math.round(current * 10) / 10;
  const progress = lowerIsBetter
    ? Math.max(0, Math.min(100, Math.round((target / (current || 1)) * 100)))
    : Math.max(0, Math.min(100, Math.round((current / target) * 100)));
  return { name, metric, current: rounded, target, unit, year: 2027, progress };
}
