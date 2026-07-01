'use client';

import React, { useState } from 'react';
import { FieldSelector } from '@/components/ack/FieldSelector';
import SourceTable from '@/components/source-table/SourceTable';
import type { FieldMetadata, Sort } from '@/lib/types';

interface StepSourceTableProps {
  authKey: string;
  authToken: string;
  authLoading: boolean;
  datasetId: string;
  selectedFieldIds: string[];
  selectedFields: FieldMetadata[];
  sorts: Sort[];
  onFieldSelectionChanged: (fields: FieldMetadata[]) => void;
  onDatasetNameResolved: (name: string) => void;
  onSortChange: (sorts: Sort[]) => void;
  onContinue: () => void | Promise<void>;
}

export default function StepSourceTable({
  authKey,
  authToken,
  authLoading,
  datasetId,
  selectedFieldIds,
  selectedFields,
  sorts,
  onFieldSelectionChanged,
  onDatasetNameResolved,
  onSortChange,
  onContinue,
}: StepSourceTableProps) {
  const hasFields = selectedFields.length > 0;
  const [fieldsExpanded, setFieldsExpanded] = useState(true);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Single scroll region: Choose Columns + preview (footer stays pinned below) */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {/* Top: collapsible field selection panel */}
        <div className="border-b border-gray-200 bg-white">
          <div
            className="flex cursor-pointer items-center justify-between px-6 py-2.5 transition-colors select-none hover:bg-gray-50/50"
            onClick={() => setFieldsExpanded(!fieldsExpanded)}
          >
            <div className="flex items-center gap-2">
              <svg
                className={`h-4 w-4 text-gray-400 transition-transform ${fieldsExpanded ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              <h2 className="text-sm font-semibold text-gray-800">Choose Columns</h2>
              {hasFields && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                  {selectedFields.length} selected
                </span>
              )}
            </div>
            {hasFields && !fieldsExpanded && (
              <div className="flex max-w-md items-center gap-1 overflow-hidden">
                {selectedFields.slice(0, 6).map((f) => (
                  <span
                    key={f.id}
                    className="inline-block max-w-[100px] truncate rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600"
                  >
                    {f.name?.en || f.id}
                  </span>
                ))}
                {selectedFields.length > 6 && (
                  <span className="text-[10px] text-gray-400">+{selectedFields.length - 6}</span>
                )}
              </div>
            )}
          </div>

          {fieldsExpanded && (
            <div className="px-6 pb-4">
              {authLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
                  <span className="ml-2 text-sm text-gray-400">Connecting...</span>
                </div>
              ) : authKey && authToken ? (
                <FieldSelector
                  authKey={authKey}
                  authToken={authToken}
                  datasetId={datasetId}
                  selectedFieldIds={selectedFieldIds}
                  onSelectionChanged={onFieldSelectionChanged}
                  onDatasetNameResolved={onDatasetNameResolved}
                />
              ) : (
                <div className="flex items-center justify-center gap-3 py-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                    <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700">Connection Pending</h3>
                    <p className="text-xs text-gray-400">
                      Configure credentials to load authorized logistics datasets and field metadata.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main: source table or empty state */}
        {hasFields ? (
          <div className="bg-white">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-2.5">
              <h3 className="text-xs font-bold tracking-wider text-gray-400 uppercase">Data Preview</h3>
            </div>
            <SourceTable
              selectedFields={selectedFields}
              datasetId={datasetId}
              authKey={authKey}
              authToken={authToken}
              sorts={sorts}
              onSortChange={onSortChange}
            />
          </div>
        ) : (
          <div className="flex min-h-[280px] flex-col items-center justify-center p-12 sm:min-h-[320px]">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50">
              <svg className="h-8 w-8 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <h3 className="mb-1 text-base font-semibold text-gray-800">Pick some columns</h3>
            <p className="max-w-sm text-center text-sm text-gray-500">
              Select fields to build your Source Table from shipment, carrier, route, warehouse, and delivery performance data.
            </p>
          </div>
        )}
      </div>

      {/* Bottom action bar — stays visible at the bottom of the workbook column */}
      <div className="flex flex-shrink-0 items-center justify-between border-t border-gray-200 bg-white px-6 py-3">
        <span className="text-sm text-gray-500">
          {hasFields ? (
            <>
              <span className="font-semibold text-gray-700">{selectedFields.length}</span> columns
            </>
          ) : (
            <span className="text-gray-400">No columns selected</span>
          )}
        </span>
        <button
          onClick={() => void onContinue()}
          disabled={!hasFields}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
        >
          Continue
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
