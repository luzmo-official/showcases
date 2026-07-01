'use client';

import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  WorkbookDefinition,
  CanvasItemDefinition,
  FieldMetadata,
  GridPosition,
  ItemFilterGroup,
  Sort,
} from '@/lib/types';
import {
  saveWorkbookDefinition,
  loadWorkbookDefinitions,
} from '@/lib/services/workbook-service';

interface UseWorkbookReturn {
  workbook: WorkbookDefinition;
  savedWorkbooks: WorkbookDefinition[];
  selectedFields: FieldMetadata[];
  setSelectedFields: (fields: FieldMetadata[]) => void;
  filters: ItemFilterGroup[];
  setFilters: (filters: ItemFilterGroup[]) => void;
  sorts: Sort[];
  setSorts: (sorts: Sort[]) => void;
  setWorkbookName: (name: string) => void;
  setWorkbookDescription: (description: string) => void;
  setDatasetId: (id: string) => void;
  setDatasetName: (name: string) => void;
  addCanvasItem: (item: Omit<CanvasItemDefinition, 'id' | 'position'>) => void;
  /** Append several items in a left-to-right grid (e.g. onboarding suggestions). */
  addCanvasItemsBatch: (
    items: Array<Omit<CanvasItemDefinition, 'id' | 'position'>>,
    layout: { sizeX: number; sizeY: number }
  ) => void;
  removeCanvasItem: (id: string) => void;
  updateCanvasItem: (id: string, updates: Partial<CanvasItemDefinition>) => void;
  updateCanvasLayout: (items: CanvasItemDefinition[]) => void;
  saveWorkbook: (meta?: { name?: string; description?: string }) => void;
  loadWorkbook: (id: string) => void;
  newWorkbook: () => void;
  refreshSavedList: () => void;
}

function createEmptyWorkbook(): WorkbookDefinition {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    name: '',
    description: '',
    createdAt: now,
    updatedAt: now,
    sourceTable: {
      datasetId: '',
      datasetName: '',
      selectedFields: [],
      filters: [],
      sorts: [],
    },
    canvasItems: [],
    chartConfigs: {},
  };
}

export function useWorkbook(): UseWorkbookReturn {
  const [workbook, setWorkbook] = useState<WorkbookDefinition>(createEmptyWorkbook);
  const [savedWorkbooks, setSavedWorkbooks] = useState<WorkbookDefinition[]>([]);

  // Load persisted workbooks once after mount (deferred to keep SSR/hydration in sync).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only read from localStorage
    setSavedWorkbooks(loadWorkbookDefinitions());
  }, []);

  const setSelectedFields = useCallback((fields: FieldMetadata[]) => {
    setWorkbook((prev) => ({
      ...prev,
      sourceTable: { ...prev.sourceTable, selectedFields: fields },
    }));
  }, []);

  const setFilters = useCallback((filters: ItemFilterGroup[]) => {
    setWorkbook((prev) => ({
      ...prev,
      sourceTable: { ...prev.sourceTable, filters },
    }));
  }, []);

  const setSorts = useCallback((sorts: Sort[]) => {
    setWorkbook((prev) => ({
      ...prev,
      sourceTable: { ...prev.sourceTable, sorts },
    }));
  }, []);

  const setWorkbookName = useCallback((name: string) => {
    setWorkbook((prev) => ({ ...prev, name }));
  }, []);

  const setWorkbookDescription = useCallback((description: string) => {
    setWorkbook((prev) => ({ ...prev, description }));
  }, []);

  const setDatasetId = useCallback((id: string) => {
    setWorkbook((prev) => ({
      ...prev,
      sourceTable: { ...prev.sourceTable, datasetId: id },
    }));
  }, []);

  const setDatasetName = useCallback((name: string) => {
    setWorkbook((prev) => ({
      ...prev,
      sourceTable: { ...prev.sourceTable, datasetName: name },
    }));
  }, []);

  /** Must match `AckDashboardGrid` (`luzmo-item-grid` `columns`). */
  const nextPosition = useCallback((items: CanvasItemDefinition[]) => {
    const GRID_COLUMNS = 48;
    const DEFAULT_W = 12;
    const DEFAULT_H = 24;
    const lastItem = items[items.length - 1];
    if (!lastItem) return { col: 0, row: 0, sizeX: DEFAULT_W, sizeY: DEFAULT_H };
    const nextCol = lastItem.position.col + lastItem.position.sizeX;
    if (nextCol + DEFAULT_W <= GRID_COLUMNS) {
      return { col: nextCol, row: lastItem.position.row, sizeX: DEFAULT_W, sizeY: DEFAULT_H };
    }
    const maxRow = items.reduce((max, item) => Math.max(max, item.position.row + item.position.sizeY), 0);
    return { col: 0, row: maxRow, sizeX: DEFAULT_W, sizeY: DEFAULT_H };
  }, []);

  const addCanvasItem = useCallback(
    (item: Omit<CanvasItemDefinition, 'id' | 'position'>) => {
      setWorkbook((prev) => {
        const newItem: CanvasItemDefinition = {
          ...item,
          id: uuidv4(),
          position: nextPosition(prev.canvasItems),
        };
        return { ...prev, canvasItems: [...prev.canvasItems, newItem] };
      });
    },
    [nextPosition]
  );

  const addCanvasItemsBatch = useCallback(
    (items: Array<Omit<CanvasItemDefinition, 'id' | 'position'>>, layout: { sizeX: number; sizeY: number }) => {
      if (items.length === 0) return;
      const GRID_COLUMNS = 48;
      const { sizeX: w, sizeY: h } = layout;
      const tilesPerRow = Math.max(1, Math.floor(GRID_COLUMNS / w));

      setWorkbook((prev) => {
        const startRow = prev.canvasItems.reduce(
          (m, i) => Math.max(m, i.position.row + i.position.sizeY),
          0
        );
        const nextItems: CanvasItemDefinition[] = items.map((item, i) => {
          const row = startRow + Math.floor(i / tilesPerRow) * h;
          const col = (i % tilesPerRow) * w;
          const position: GridPosition = { col, row, sizeX: w, sizeY: h };
          return { ...item, id: uuidv4(), position };
        });
        return { ...prev, canvasItems: [...prev.canvasItems, ...nextItems] };
      });
    },
    []
  );

  const removeCanvasItem = useCallback((id: string) => {
    setWorkbook((prev) => ({
      ...prev,
      canvasItems: prev.canvasItems.filter((item) => item.id !== id),
    }));
  }, []);

  const updateCanvasItem = useCallback(
    (id: string, updates: Partial<CanvasItemDefinition>) => {
      setWorkbook((prev) => ({
        ...prev,
        canvasItems: prev.canvasItems.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
      }));
    },
    []
  );

  const updateCanvasLayout = useCallback((items: CanvasItemDefinition[]) => {
    setWorkbook((prev) => ({ ...prev, canvasItems: items }));
  }, []);

  const saveWorkbook = useCallback((meta?: { name?: string; description?: string }) => {
    const updated = {
      ...workbook,
      name: meta?.name ?? workbook.name,
      description: meta?.description ?? workbook.description ?? '',
      updatedAt: new Date().toISOString(),
    };
    saveWorkbookDefinition(updated);
    setWorkbook(updated);
    setSavedWorkbooks(loadWorkbookDefinitions());
  }, [workbook]);

  const loadWorkbook = useCallback((id: string) => {
    const definitions = loadWorkbookDefinitions();
    const found = definitions.find((w) => w.id === id);
    if (found) {
      setWorkbook(found);
    }
  }, []);

  const newWorkbook = useCallback(() => {
    setWorkbook(createEmptyWorkbook());
  }, []);

  const refreshSavedList = useCallback(() => {
    setSavedWorkbooks(loadWorkbookDefinitions());
  }, []);

  return {
    workbook,
    savedWorkbooks,
    selectedFields: workbook.sourceTable.selectedFields,
    setSelectedFields,
    filters: workbook.sourceTable.filters,
    setFilters,
    sorts: workbook.sourceTable.sorts,
    setSorts,
    setWorkbookName,
    setWorkbookDescription,
    setDatasetId,
    setDatasetName,
    addCanvasItem,
    addCanvasItemsBatch,
    removeCanvasItem,
    updateCanvasItem,
    updateCanvasLayout,
    saveWorkbook,
    loadWorkbook,
    newWorkbook,
    refreshSavedList,
  };
}
