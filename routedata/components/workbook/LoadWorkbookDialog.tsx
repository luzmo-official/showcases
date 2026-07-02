'use client';

import React from 'react';
import type { WorkbookDefinition } from '@/lib/types';

interface LoadWorkbookDialogProps {
  open: boolean;
  workbooks: WorkbookDefinition[];
  onLoad: (id: string) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export default function LoadWorkbookDialog({ open, workbooks, onLoad, onClose, onDelete }: LoadWorkbookDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Load Workbook</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 max-h-[400px] overflow-y-auto">
          {workbooks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No saved projects yet.</p>
              <p className="text-xs text-gray-400 mt-1">Create and save a workbook to see it here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {workbooks.map((wb) => (
                <div
                  key={wb.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50/30 transition-all cursor-pointer group"
                  onClick={() => onLoad(wb.id)}
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-medium text-gray-700 truncate">{wb.name || 'Untitled Workbook'}</h4>
                    {wb.description?.trim() && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{wb.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-400">{wb.sourceTable.selectedFields.length} fields</span>
                      <span className="text-xs text-gray-400">{wb.canvasItems.length} items</span>
                      <span className="text-xs text-gray-400">{new Date(wb.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); onLoad(wb.id); }}
                      className="px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors"
                    >
                      Open
                    </button>
                    {onDelete && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(wb.id); }}
                        className="p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
