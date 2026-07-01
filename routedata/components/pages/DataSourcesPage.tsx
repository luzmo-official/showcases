'use client';

import React from 'react';
import { useDatasetInfo } from '@/hooks/useDatasetInfo';

const TYPE_ICONS: Record<string, string> = {
  numeric: '🔢',
  hierarchy: '📂',
  datetime: '📅',
};

const TYPE_COLORS: Record<string, string> = {
  numeric: 'bg-blue-100 text-blue-700',
  hierarchy: 'bg-green-100 text-green-700',
  datetime: 'bg-amber-100 text-amber-700',
};

export default function DataSourcesPage() {
  const { dataset, loading } = useDatasetInfo();

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Data Sources</h1>
            <p className="text-sm text-gray-500 mt-1">Connected logistics datasets and shipment schema.</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-32 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : dataset ? (
          <>
            {/* Dataset card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-100">
                    <span className="text-lg">🗄️</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{dataset.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">{dataset.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Connected
                    </span>
                    <p className="text-[10px] text-gray-400 mt-0.5">{dataset.totalRows.toLocaleString()} rows</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Columns table */}
            <h2 className="text-sm font-bold text-gray-900 mb-3">Logistics Fields ({dataset.columns.length})</h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Column Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Column ID</th>
                  </tr>
                </thead>
                <tbody>
                  {dataset.columns.map((col) => (
                    <tr key={col.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span>{TYPE_ICONS[col.type] ?? '📄'}</span>
                          <span className="font-medium text-gray-800">{col.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[col.type] ?? 'bg-gray-100 text-gray-600'}`}>
                          {col.type}{col.subtype ? ` (${col.subtype})` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{col.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-500">Failed to load dataset information.</p>
          </div>
        )}
      </div>
    </div>
  );
}
