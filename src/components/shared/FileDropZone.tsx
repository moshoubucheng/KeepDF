import { useState, useCallback, useRef, type DragEvent } from 'react';

export interface FileDropZoneTranslations {
  dropFiles?: string;
  dropFile?: string;
  supported?: string;
}

interface FileDropZoneProps {
  onFiles: (files: FileList | File[]) => void;
  accept: string[];
  multiple?: boolean;
  label?: string;
  translations?: FileDropZoneTranslations;
}

export default function FileDropZone({
  onFiles,
  accept,
  multiple = true,
  label = 'Drop files here or click to browse',
  translations,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        onFiles(e.dataTransfer.files);
      }
    },
    [onFiles]
  );

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFiles(e.target.files);
      e.target.value = '';
    }
  };

  const acceptStr = accept
    .filter((a) => a.startsWith('.') || a.includes('/'))
    .join(',');

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`cursor-pointer rounded-xl border-2 border-dashed p-6 sm:p-10 text-center transition-colors ${
        isDragging
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-950'
          : 'border-edge-input bg-surface hover:border-brand-400 hover:bg-hover'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptStr}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />
      <div className="pointer-events-none">
        <svg
          className="mx-auto mb-3 h-10 w-10 text-fg-faint"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
        <p className="text-sm font-medium text-fg-sec">{translations?.dropFiles ?? label}</p>
        <p className="mt-1 text-xs text-fg-muted">
          {translations?.supported ?? 'Supported'}: {accept.filter((a) => a.startsWith('.')).join(', ')}
        </p>
      </div>
    </div>
  );
}
