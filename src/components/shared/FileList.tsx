import { useState, useCallback } from 'react';
import type { ProcessingFile } from '@types/file';
import { formatFileSize } from '@lib/utils/fileHelpers';

export interface FileListTranslations {
  moveUp?: string;
  moveDown?: string;
  remove?: string;
  saved?: string;
}

interface FileListProps {
  files: ProcessingFile[];
  onRemove: (id: string) => void;
  onMove?: (from: number, to: number) => void;
  showResult?: boolean;
  translations?: FileListTranslations;
}

export default function FileList({ files, onRemove, onMove, showResult = false, translations }: FileListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((i: number) => {
    setDragIndex(i);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, i: number) => {
    e.preventDefault();
    setDragOverIndex(i);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex && onMove) {
      onMove(dragIndex, dragOverIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, dragOverIndex, onMove]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  if (files.length === 0) return null;

  return (
    <ul className="mt-4 divide-y divide-edge-soft rounded-lg border border-edge bg-surface">
      {files.map((f, i) => (
        <li
          key={f.id}
          draggable={!!onMove}
          onDragStart={() => handleDragStart(i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
          className={`flex items-center gap-3 px-4 py-3 ${
            f.status === 'processing' ? 'animate-subtle-pulse' : ''
          } ${dragIndex === i ? 'opacity-50' : ''} ${
            dragOverIndex === i && dragIndex !== i ? 'border-t-2 border-brand-500' : ''
          }`}
        >
          {onMove && (
            <>
              {/* Desktop grip handle */}
              <div className="hidden sm:flex cursor-grab items-center text-fg-faint">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <circle cx="7" cy="4" r="1.5" />
                  <circle cx="13" cy="4" r="1.5" />
                  <circle cx="7" cy="10" r="1.5" />
                  <circle cx="13" cy="10" r="1.5" />
                  <circle cx="7" cy="16" r="1.5" />
                  <circle cx="13" cy="16" r="1.5" />
                </svg>
              </div>

              {/* Mobile move buttons */}
              <div className="flex flex-col gap-0.5 sm:hidden">
                <button
                  onClick={() => i > 0 && onMove(i, i - 1)}
                  disabled={i === 0}
                  className="h-11 w-11 flex items-center justify-center rounded-lg text-fg-faint hover:text-fg-sec disabled:opacity-30"
                  aria-label={translations?.moveUp ?? 'Move up'}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => i < files.length - 1 && onMove(i, i + 1)}
                  disabled={i === files.length - 1}
                  className="h-11 w-11 flex items-center justify-center rounded-lg text-fg-faint hover:text-fg-sec disabled:opacity-30"
                  aria-label={translations?.moveDown ?? 'Move down'}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{f.name}</p>
            <p className="text-xs text-fg-muted">
              {formatFileSize(f.size)}
              {showResult && f.result && (
                <span className="ml-2 text-green-600">
                  → {formatFileSize(f.result.resultSize)}
                  {' '}
                  ({Math.round((1 - f.result.resultSize / f.result.originalSize) * 100)}% {translations?.saved ?? 'saved'})
                </span>
              )}
            </p>
          </div>

          {f.status === 'processing' && (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          )}
          {f.status === 'done' && (
            <span className="text-green-500">✓</span>
          )}
          {f.status === 'error' && (
            <span className="text-xs text-red-500" title={f.error}>✗</span>
          )}

          <button
            onClick={() => onRemove(f.id)}
            className="h-11 w-11 sm:h-auto sm:w-auto flex items-center justify-center rounded-lg sm:rounded sm:p-1 text-fg-faint hover:bg-hover-strong hover:text-fg-sec"
            aria-label={translations?.remove ?? 'Remove'}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  );
}
