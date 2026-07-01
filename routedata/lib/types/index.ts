export interface Dataset {
  id: string;
  name: Record<string, string>;
  description?: Record<string, string>;
  columns: FieldMetadata[];
  formulas?: FormulaMetadata[];
}

export interface FieldMetadata {
  id: string;
  name: Record<string, string>;
  description?: Record<string, string>;
  type: 'numeric' | 'datetime' | 'hierarchy' | 'spatial';
  subtype?: string;
  format?: string;
  hidden?: boolean;
  lowestLevel?: number;
  highestLevel?: number;
  hierarchy_enabled?: boolean;
  hierarchyLevels?: Array<{
    id: string;
    level: number;
    name: Record<string, string>;
  }>;
  expression?: string;
  joins?: Array<{
    id: string;
    securable_id: string;
    hierarchy_enabled: boolean;
    currency_id?: string;
  }>;
}

export interface FormulaMetadata {
  id: string;
  name: Record<string, string>;
  description?: Record<string, string>;
  type: 'numeric' | 'datetime' | 'hierarchy';
  expression: string;
}

export interface Filter {
  field: string;
  fieldId: string;
  datasetId: string;
  operator: string;
  value: string | number | string[];
}

export interface ItemFilterGroup {
  condition: 'and' | 'or';
  filters: Array<{
    expression: string;
    parameters: [{ columnId: string; datasetId: string }, ...unknown[]];
  }>;
  subGroups?: ItemFilterGroup[];
}

export interface Sort {
  fieldId: string;
  datasetId: string;
  direction: 'asc' | 'desc';
}

export interface SourceTableConfig {
  datasetId: string;
  selectedFieldIds: string[];
  filters: ItemFilterGroup[];
  sorts: Sort[];
  limit?: number;
  offset?: number;
}

export interface SourceTableDefinition {
  datasetId: string;
  datasetName: string;
  selectedFields: FieldMetadata[];
  filters: ItemFilterGroup[];
  sorts: Sort[];
}

/** Charts rendered from Luzmo `POST /0.1.0/data` + SVG (no Flex / `LuzmoVizItemComponent`). */
export type NativeChartKind = 'bar' | 'line';

export interface NativeChartSpec {
  kind: NativeChartKind;
  datasetId: string;
  dimensionFieldId: string;
  measureFieldId: string;
  /** Column types from Luzmo (stored so saved workbooks can re-query). */
  dimensionType: string;
  measureType: string;
  dimensionLowestLevel?: number;
  dimensionHighestLevel?: number;
  hierarchyEnabled?: boolean;
  /** Display labels when the field list is not available */
  dimensionLabel?: string;
  measureLabel?: string;
}

export interface CanvasItemDefinition {
  id: string;
  type: string;
  title: string;
  options: Record<string, unknown>;
  slots: VizItemSlot[];
  filters?: ItemFilterGroup[];
  position: GridPosition;
}

export interface VizItemSlot {
  name: string;
  content: SlotContent[];
}

export interface SlotContent {
  columnId?: string;
  column?: string;
  datasetId?: string;
  set?: string;
  formulaId?: string;
  formula?: string;
  level?: number;
  label?: Record<string, string>;
}

export interface GridPosition {
  col: number;
  row: number;
  sizeX: number;
  sizeY: number;
}

export interface WorkbookDefinition {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  sourceTable: SourceTableDefinition;
  canvasItems: CanvasItemDefinition[];
  chartConfigs: Record<string, ChartConfigState>;
}

export interface ChartConfigState {
  itemType: string;
  slotsContents: VizItemSlot[];
  options: Record<string, unknown>;
  filters: ItemFilterGroup[];
}

export interface EmbedAuthResponse {
  authKey: string;
  authToken: string;
  /** Luzmo may return a warning when the API user cannot fully grant requested access — Flex can still fail. */
  warning?: string;
  /** Dataset the token was minted for (echo from `/api/embed-token`). */
  datasetIdUsed?: string;
}

export interface LuzmoConnectionStatus {
  connected: boolean;
  datasetsAvailable: number;
  lastChecked: string | null;
}

export interface HeaderProps {
  connected: boolean;
  workbookName: string;
  onNewWorkbook: () => void;
  onSaveWorkbook: () => void | Promise<void>;
  onLoadWorkbook: () => void;
  hasUnsavedChanges?: boolean;
}
