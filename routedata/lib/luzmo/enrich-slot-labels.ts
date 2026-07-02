import type { FieldMetadata } from '@/lib/types';

type IdName = { id: string; name: Record<string, string> };

function fieldMap(fields: IdName[]): Map<string, IdName> {
  return new Map(fields.map((f) => [f.id, f]));
}

/**
 * Flex / ACK slot content should carry `label: { en, ... }` for UI chips. AI and some
 * persisted payloads only set `columnId`, so pickers show UUIDs. Merge in names from the
 * dataset field list whenever we can resolve `columnId`.
 */
export function enrichSlotsWithFieldLabels(
  slots: unknown[] | undefined,
  fields: FieldMetadata[] | IdName[]
): unknown[] {
  if (!Array.isArray(slots) || slots.length === 0) return Array.isArray(slots) ? [...slots] : [];
  const byId = fieldMap(fields as IdName[]);

  const enrichItem = (item: unknown): unknown => {
    if (!item || typeof item !== 'object') return item;
    const o = item as Record<string, unknown>;
    const columnId =
      typeof o.columnId === 'string'
        ? o.columnId
        : typeof o.column === 'string'
          ? o.column
          : undefined;
    const field = columnId ? byId.get(columnId) : undefined;

    const next: Record<string, unknown> = { ...o };

    if (field?.name && Object.keys(field.name).length > 0) {
      next.label = { ...field.name };
    } else if (typeof o.label === 'string') {
      next.label = { en: o.label };
    }

    return next;
  };

  return slots.map((slot) => {
    if (!slot || typeof slot !== 'object') return slot;
    const s = slot as { name?: string; content?: unknown[] };
    const content = Array.isArray(s.content) ? s.content.map(enrichItem) : s.content;
    return { ...s, content };
  });
}
