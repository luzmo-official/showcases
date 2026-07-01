'use client';

import React, { useRef, useEffect } from 'react';
import '@luzmo/analytics-components-kit/item-option-panel';
import { StackLabelBadge } from '@/components/dev/StackLabelBadge';

interface EditItemPanelProps {
  authKey: string;
  authToken: string;
  itemType: string;
  options: Record<string, unknown>;
  slots?: unknown[];
  onOptionsChanged: (options: Record<string, unknown>) => void;
}

export function EditItemPanel({
  authKey,
  authToken,
  itemType,
  options,
  slots = [],
  onOptionsChanged,
}: EditItemPanelProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const element = el as HTMLElement & {
      options?: Record<string, unknown>;
      slots?: unknown[];
    };
    element.options = options;
    element.slots = slots;

    const handleOptionsChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ options?: Record<string, unknown> }>;
      const newOptions = customEvent.detail?.options ?? {};
      onOptionsChanged(newOptions);
    };

    el.addEventListener('luzmo-options-changed', handleOptionsChanged);
    return () => {
      el.removeEventListener('luzmo-options-changed', handleOptionsChanged);
    };
  }, [options, slots, onOptionsChanged]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const element = el as HTMLElement & {
      options?: Record<string, unknown>;
      slots?: unknown[];
    };
    element.options = options;
    element.slots = slots;
  }, [options, slots]);

  return (
    <StackLabelBadge
      className="max-h-[600px] overflow-auto rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      label="luzmo-item-option-panel"
      description="ACK panel for chart type, series, and display options on the selected Flex item."
      title="Luzmo Analytics Components Kit — luzmo-item-option-panel"
    >
      <luzmo-item-option-panel
        ref={ref}
        auth-key={authKey}
        auth-token={authToken}
        item-type={itemType}
        language="en"
        size="m"
      />
    </StackLabelBadge>
  );
}
