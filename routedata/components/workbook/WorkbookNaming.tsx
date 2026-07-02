'use client';

import React, { useState, useRef, useEffect } from 'react';
import { WORKBOOK_NAME_EXAMPLES } from '@/lib/domain/routedata';

interface WorkbookNamingProps {
  name: string;
  onNameChange: (name: string) => void;
  hasSourceTable: boolean;
}

const PLACEHOLDER_EXAMPLES = WORKBOOK_NAME_EXAMPLES;

export default function WorkbookNaming({ name, onNameChange, hasSourceTable }: WorkbookNamingProps) {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [placeholder] = useState(
    () => PLACEHOLDER_EXAMPLES[Math.floor(Math.random() * PLACEHOLDER_EXAMPLES.length)]
  );

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (!hasSourceTable) return null;

  return (
    <div className="flex items-center gap-2">
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onBlur={() => setIsEditing(false)}
          onKeyDown={(e) => { if (e.key === 'Enter') setIsEditing(false); }}
          placeholder={placeholder}
          className="text-lg font-semibold text-gray-800 bg-transparent border-b-2 border-green-400 outline-none px-1 py-0.5 min-w-[200px]"
        />
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="group flex items-center gap-2 text-lg font-semibold text-gray-800 hover:text-green-700 transition-colors"
        >
          <span>{name || placeholder}</span>
          <svg className="w-4 h-4 text-gray-300 group-hover:text-green-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
          </svg>
        </button>
      )}
    </div>
  );
}
