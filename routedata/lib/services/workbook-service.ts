import type { WorkbookDefinition } from '@/lib/types';

const STORAGE_KEY = 'routedata:workbooks';

/** Older keys — migrated once into `STORAGE_KEY` on read. */
const LEGACY_STORAGE_KEYS = [
  'logistics-workbook-studio:workbooks',
  'sustainability-workbook-studio:workbooks',
] as const;

function migrateLegacyStorageOnce(): void {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(STORAGE_KEY)) {
    for (const key of LEGACY_STORAGE_KEYS) localStorage.removeItem(key);
    return;
  }
  for (const key of LEGACY_STORAGE_KEYS) {
    const legacy = localStorage.getItem(key);
    if (legacy) {
      localStorage.setItem(STORAGE_KEY, legacy);
      localStorage.removeItem(key);
      return;
    }
  }
}

export function saveWorkbookDefinition(workbook: WorkbookDefinition): void {
  const existing = loadWorkbookDefinitions();
  const idx = existing.findIndex((w) => w.id === workbook.id);
  if (idx >= 0) {
    existing[idx] = { ...workbook, updatedAt: new Date().toISOString() };
  } else {
    existing.push(workbook);
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    for (const key of LEGACY_STORAGE_KEYS) localStorage.removeItem(key);
  }
}

export function loadWorkbookDefinitions(): WorkbookDefinition[] {
  if (typeof window === 'undefined') return [];
  try {
    migrateLegacyStorageOnce();
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function deleteWorkbookDefinition(id: string): void {
  const existing = loadWorkbookDefinitions();
  const filtered = existing.filter((w) => w.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
}

export function getWorkbookById(id: string): WorkbookDefinition | undefined {
  return loadWorkbookDefinitions().find((w) => w.id === id);
}
