'use client';

import React from 'react';
import type { AppPage } from '@/components/nav/SideNav';
import type { WorkbookDefinition } from '@/lib/types';

interface DashboardsPageProps {
  onNavigate: (page: AppPage) => void;
  savedWorkbooks: WorkbookDefinition[];
  onLoadWorkbook: (id: string) => void | Promise<void>;
  onDeleteWorkbook: (id: string) => void;
}

export default function DashboardsPage({ onNavigate, savedWorkbooks, onLoadWorkbook, onDeleteWorkbook }: DashboardsPageProps) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Dashboards</h1>
            <p className="text-sm text-gray-500 mt-1">Saved RouteData workbooks and operational dashboards.</p>
          </div>
          <button
            onClick={() => onNavigate('reporting')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Workbook
          </button>
        </div>

        {savedWorkbooks.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-green-50 mx-auto mb-4">
              <svg className="w-7 h-7 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">No dashboards yet</p>
            <p className="text-xs text-gray-400 mb-4">Create a new workbook in Workbook and save it.</p>
            <button
              onClick={() => onNavigate('reporting')}
              className="text-sm font-semibold text-green-600 hover:text-green-700"
            >
              Go to Workbook →
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Charts</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Last Updated</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Dataset</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {savedWorkbooks.map((wb) => (
                  <tr key={wb.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{wb.name || 'Untitled Workbook'}</p>
                      {wb.description?.trim() && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{wb.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{wb.canvasItems.length}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(wb.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {wb.sourceTable.datasetName || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onLoadWorkbook(wb.id)}
                          className="text-xs font-medium text-green-600 hover:text-green-700 hover:underline"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => onDeleteWorkbook(wb.id)}
                          className="text-xs font-medium text-gray-400 hover:text-red-500"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
