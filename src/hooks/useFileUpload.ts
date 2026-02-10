import { useState, useCallback } from 'react';
import type { ProcessingFile } from '@types/file';
import { generateId, validateFileType } from '@lib/utils/fileHelpers';

export function useFileUpload(acceptedTypes: string[]) {
  const [files, setFiles] = useState<ProcessingFile[]>([]);

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const arr = Array.from(newFiles);
      const valid = arr.filter((f) => validateFileType(f, acceptedTypes));
      const mapped: ProcessingFile[] = valid.map((f) => ({
        id: generateId(),
        file: f,
        name: f.name,
        size: f.size,
        status: 'pending',
        progress: 0,
      }));
      setFiles((prev) => [...prev, ...mapped]);
    },
    [acceptedTypes]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  const updateFile = useCallback(
    (id: string, updates: Partial<ProcessingFile>) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
      );
    },
    []
  );

  const moveFile = useCallback((fromIndex: number, toIndex: number) => {
    setFiles((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }, []);

  return { files, setFiles, addFiles, removeFile, clearFiles, updateFile, moveFile };
}
