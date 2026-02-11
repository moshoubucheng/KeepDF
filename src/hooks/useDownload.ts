import { useCallback } from 'react';
import { downloadBlob, downloadMultipleBlobs } from '@lib/utils/download';

function trackUsage() {
  let p = window.location.pathname.replace(/\/$/, '');
  p = p.replace(/^\/(ja|zh)\//, '/');
  if (/^\/(pdf|image|doc)\/[\w-]+$/.test(p)) {
    navigator.sendBeacon('/api/track', JSON.stringify({ path: p, type: 'usage' }));
  }
}

export function useDownload() {
  const download = useCallback((blob: Blob, filename: string) => {
    downloadBlob(blob, filename);
    trackUsage();
  }, []);

  const downloadAll = useCallback(
    (items: { blob: Blob; filename: string }[]) => {
      downloadMultipleBlobs(items);
      trackUsage();
    },
    []
  );

  return { download, downloadAll };
}
