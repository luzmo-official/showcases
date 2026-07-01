import type { FieldMetadata } from '@/lib/types';

/** ACK `datasetsDataFields` entry for luzmo-data-field-panel / luzmo-item-slot-picker-panel */
export type WorkbookDatasetsDataFieldsEntry = {
  id: string;
  name: Record<string, string>;
  /** Column metadata: ACK matches pickers with `columns[].id` (not `columnId`). */
  columns: {
    id: string;
    type: string;
    name: Record<string, string>;
    subtype?: string;
    lowestLevel?: number;
    highestLevel?: number;
    hierarchy_enabled?: boolean;
    hierarchyLevels?: Array<{ id: string; level: number; name: Record<string, string> }>;
    format?: string;
    description?: Record<string, string>;
  }[];
  formulas: never[];
};

/**
 * When the workbook restricts charts to columns chosen in the data step, pass this shape
 * so ACK pickers only list those fields (same as dragging from a restricted data field panel).
 */
export function buildWorkbookDatasetsDataFields(
  datasetId: string,
  datasetName: string | undefined,
  restrictToFields: FieldMetadata[] | undefined
): WorkbookDatasetsDataFieldsEntry[] | null {
  if (!restrictToFields?.length) return null;
  const columns = restrictToFields
    .filter((f) => typeof f.id === 'string' && f.id.trim().length > 0)
    .map((f) => ({
      id: f.id,
      type: f.type,
      name:
        f.name && Object.keys(f.name).length > 0
          ? f.name
          : { en: f.id },
      subtype: f.subtype,
      lowestLevel: f.lowestLevel,
      highestLevel: f.highestLevel,
      hierarchy_enabled: f.hierarchy_enabled,
      hierarchyLevels: f.hierarchyLevels,
      format: f.format,
      description: f.description,
    }));
  if (columns.length === 0) return null;
  return [
    {
      id: datasetId,
      name: { en: datasetName || 'Dataset' },
      columns,
      formulas: [],
    },
  ];
}
