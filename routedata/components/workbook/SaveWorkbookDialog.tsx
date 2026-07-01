'use client';

import React, { useState } from 'react';

interface SaveWorkbookDialogProps {
  open: boolean;
  initialName: string;
  initialDescription?: string;
  onSave: (payload: { name: string; description: string }) => void;
  onClose: () => void;
}

export default function SaveWorkbookDialog({
  open,
  initialName,
  initialDescription = '',
  onSave,
  onClose,
}: SaveWorkbookDialogProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [wasOpen, setWasOpen] = useState(open);

  // Reset the form to the incoming values each time the dialog transitions to open.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(initialName || '');
      setDescription(initialDescription || '');
    }
  }

  if (!open) return null;

  const trimmedName = name.trim();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Save Workbook</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Workbook Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Q2 Carrier Reliability Review"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary of what this workbook tracks and who it is for."
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ name: trimmedName, description: description.trim() })}
            disabled={!trimmedName}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              trimmedName
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Save Workbook
          </button>
        </div>
      </div>
    </div>
  );
}

