/**
 * Build Luzmo Data API query fragments for `POST {apiHost}/0.1.0/data`.
 * @see https://developer.luzmo.com/ — Data API used with embed key/token from authorization.
 */

import type { FieldMetadata } from '@/lib/types';

export interface QueryDimension {
  column_id: string;
  dataset_id: string;
  level?: number;
}

export interface QueryMeasure {
  column_id: string;
  dataset_id: string;
  aggregation: { type: string };
}

/** True for category / time axes (anything that is not numeric measure). */
export function isDimensionField(f: FieldMetadata): boolean {
  return f.type !== 'numeric';
}

export function isCategoricalDimension(f: FieldMetadata): boolean {
  if (f.type === 'numeric' || f.type === 'datetime') return false;
  if (f.type === 'spatial') return false;
  return true;
}

export function dimensionToQuery(d: FieldMetadata, datasetId: string): QueryDimension {
  if (d.type === 'datetime') {
    return {
      column_id: d.id,
      dataset_id: datasetId,
      level: d.lowestLevel ?? 5,
    };
  }
  if (d.type === 'hierarchy') {
    return {
      column_id: d.id,
      dataset_id: datasetId,
      level: d.lowestLevel ?? 1,
    };
  }
  if (d.type === 'spatial') {
    return { column_id: d.id, dataset_id: datasetId };
  }
  // categorical / unknown — match useSourceTableData "else" branch, with optional level
  return {
    column_id: d.id,
    dataset_id: datasetId,
    ...(d.lowestLevel != null ? { level: d.lowestLevel } : { level: 1 }),
  };
}

/** Restore query dimension from a persisted NativeChartSpec (saved workbook). */
export function dimensionFromSpec(
  datasetId: string,
  dimensionFieldId: string,
  dimensionType: string,
  dimensionLowestLevel?: number
): QueryDimension {
  const base = { column_id: dimensionFieldId, dataset_id: datasetId };
  if (dimensionType === 'datetime') {
    return { ...base, level: dimensionLowestLevel ?? 5 };
  }
  if (dimensionType === 'hierarchy') {
    return { ...base, level: dimensionLowestLevel ?? 1 };
  }
  if (dimensionType === 'spatial') {
    return base;
  }
  return { ...base, level: dimensionLowestLevel ?? 1 };
}

export function measureSum(fieldId: string, datasetId: string): QueryMeasure {
  return {
    column_id: fieldId,
    dataset_id: datasetId,
    aggregation: { type: 'sum' },
  };
}
