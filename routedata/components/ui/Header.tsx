'use client';

import React from 'react';

interface HeaderProps {
  connected: boolean;
  workbookName: string;
  onNewWorkbook: () => void;
  onSaveWorkbook: () => void;
  onLoadWorkbook: () => void;
  hasUnsavedChanges?: boolean;
  currentStep: 'source-table' | 'dashboard';
  onStepChange: (step: 'source-table' | 'dashboard') => void | Promise<void>;
  canGoToDashboard: boolean;
}

export default function Header({
  connected,
  workbookName,
  onNewWorkbook,
  onSaveWorkbook,
  onLoadWorkbook,
  hasUnsavedChanges = false,
  currentStep,
  onStepChange,
  canGoToDashboard,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-5">
      <div className="flex items-center justify-between h-12">
        {/* Left: breadcrumb + workbook name */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-gray-400">Workbook</span>
          {workbookName && (
            <>
              <span className="text-gray-300">/</span>
              <span className="text-xs font-semibold text-gray-700 truncate max-w-[200px]">{workbookName}</span>
            </>
          )}
        </div>

        {/* Center: segmented step toggle */}
        <div className="flex items-center bg-gray-100 rounded-full p-0.5">
          <button
            onClick={() => void onStepChange('source-table')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentStep === 'source-table'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            1. Build Source Table
          </button>
          <button
            onClick={() => {
              if (canGoToDashboard) void onStepChange('dashboard');
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentStep === 'dashboard'
                ? 'bg-white text-gray-900 shadow-sm'
                : canGoToDashboard
                  ? 'text-gray-500 hover:text-gray-700'
                  : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            2. Build Workbook
          </button>
        </div>

        {/* Right: actions + status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onNewWorkbook}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              New
            </button>
            <button
              type="button"
              onClick={onLoadWorkbook}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Load
            </button>
            <button
              type="button"
              onClick={onSaveWorkbook}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 shadow-sm transition-all"
            >
              Save
              {hasUnsavedChanges && (
                <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
              )}
            </button>
          </div>

          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium ${
              connected
                ? 'text-green-700 bg-green-50'
                : 'text-amber-700 bg-amber-50'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-amber-500'}`} />
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>
    </header>
  );
}
