import { useCallback } from 'react';
import { downloadBlob, downloadMultipleBlobs } from '@lib/utils/download';

export function useDownload() {
  const download = useCallback((blob: Blob, filename: string) => {
    downloadBlob(blob, filename);
  }, []);

  const downloadAll = useCallback(
    (items: { blob: Blob; filename: string }[]) => {
      downloadMultipleBlobs(items);
    },
    []
  );

  return { download, downloadAll };
}
