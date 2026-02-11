import { useState, useCallback, useEffect } from 'react';
import FileDropZone from '@components/shared/FileDropZone';
import FileList from '@components/shared/FileList';
import ProgressBar from '@components/shared/ProgressBar';
import DownloadButton from '@components/shared/DownloadButton';
import { useFileUpload } from '@hooks/useFileUpload';
import { useDownload } from '@hooks/useDownload';
import { resizeImage } from '@lib/image/resize';
import { replaceExtension } from '@lib/utils/fileHelpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Translations } from '@/i18n/translations';

const ACCEPTED = ['.png', '.jpg', '.jpeg', '.webp', 'image/png', 'image/jpeg', 'image/webp'];

const PRESETS = [
  { label: '1920 x 1080', w: 1920, h: 1080 },
  { label: '1280 x 720', w: 1280, h: 720 },
  { label: '800 x 600', w: 800, h: 600 },
  { label: '640 x 480', w: 640, h: 480 },
];

interface ResizeImageProps {
  translations?: {
    common: Translations['common'];
    imageResize: Translations['imageResize'];
  };
}

export default function ResizeImage({ translations }: ResizeImageProps) {
  const { files, addFiles, removeFile, clearFiles, updateFile } = useFileUpload(ACCEPTED);
  const { download, downloadAll } = useDownload();

  const [width, setWidth] = useState<number>(1920);
  const [height, setHeight] = useState<number>(1080);
  const [lockAspect, setLockAspect] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  // Read original dimensions when the first file is added
  useEffect(() => {
    const firstPending = files.find((f) => f.status === 'pending');
    if (!firstPending) return;

    let cancelled = false;

    createImageBitmap(firstPending.file).then((bitmap) => {
      if (cancelled) {
        bitmap.close();
        return;
      }
      const origW = bitmap.width;
      const origH = bitmap.height;
      bitmap.close();

      setWidth(origW);
      setHeight(origH);
      setAspectRatio(origW / origH);
    });

    return () => {
      cancelled = true;
    };
    // Only re-run when the file list identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.length]);

  const handleWidthChange = useCallback(
    (newWidth: number) => {
      setWidth(newWidth);
      if (lockAspect && aspectRatio && newWidth > 0) {
        setHeight(Math.round(newWidth / aspectRatio));
      }
    },
    [lockAspect, aspectRatio],
  );

  const handleHeightChange = useCallback(
    (newHeight: number) => {
      setHeight(newHeight);
      if (lockAspect && aspectRatio && newHeight > 0) {
        setWidth(Math.round(newHeight * aspectRatio));
      }
    },
    [lockAspect, aspectRatio],
  );

  const applyPreset = useCallback(
    (w: number, h: number) => {
      setWidth(w);
      setHeight(h);
      if (lockAspect) {
        setAspectRatio(w / h);
      }
    },
    [lockAspect],
  );

  const handleResize = useCallback(async () => {
    const pending = files.filter((f) => f.status === 'pending' || f.status === 'error');
    if (pending.length === 0 || width <= 0 || height <= 0) return;

    setIsProcessing(true);
    setOverallProgress(0);

    for (let i = 0; i < pending.length; i++) {
      const pf = pending[i];
      updateFile(pf.id, { status: 'processing', progress: 0 });

      try {
        const blob = await resizeImage(pf.file, width, height);
        const ext = pf.name.split('.').pop() || 'png';
        const baseName = pf.name.slice(0, pf.name.lastIndexOf('.'));
        const filename = `${baseName}-${width}x${height}.${ext}`;

        updateFile(pf.id, {
          status: 'done',
          progress: 100,
          result: {
            blob,
            filename,
            originalSize: pf.size,
            resultSize: blob.size,
          },
        });
      } catch (err) {
        updateFile(pf.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Resize failed',
        });
      }

      setOverallProgress(Math.round(((i + 1) / pending.length) * 100));
    }

    setIsProcessing(false);
  }, [files, width, height, updateFile]);

  const doneFiles = files.filter((f) => f.status === 'done' && f.result);

  return (
    <div className="space-y-6">
      <FileDropZone
        onFiles={addFiles}
        accept={ACCEPTED}
        multiple
        label="Drop images here or click to browse"
        translations={translations ? { dropFiles: translations.common.dropFiles, supported: translations.common.supported } : undefined}
      />

      {files.length > 0 && (
        <>
          <FileList
            files={files}
            onRemove={removeFile}
            showResult
            translations={translations ? { moveUp: translations.common.moveUp, moveDown: translations.common.moveDown, remove: translations.common.remove, saved: translations.common.saved } : undefined}
          />

          {/* Dimension controls */}
          <div className="rounded-lg border border-edge bg-surface p-4">
            <p className="mb-3 text-sm font-medium text-fg-sec">Output Dimensions</p>

            <div className="flex items-end gap-3">
              {/* Width */}
              <div className="flex-1">
                <label className="mb-1 block text-xs text-fg-muted">{translations?.imageResize.width ?? 'Width'} (px)</label>
                <Input
                  type="number"
                  min={1}
                  value={width}
                  onChange={(e) => handleWidthChange(Number(e.target.value))}
                  className="tabular-nums"
                />
              </div>

              {/* Lock / unlock aspect ratio */}
              <button
                onClick={() => {
                  const next = !lockAspect;
                  setLockAspect(next);
                  if (next && width > 0 && height > 0) {
                    setAspectRatio(width / height);
                  }
                }}
                className={`mb-0.5 flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                  lockAspect
                    ? 'border-brand-500 bg-brand-50 text-brand-600'
                    : 'border-edge-input bg-surface text-fg-faint hover:border-edge-input'
                }`}
                title={lockAspect
                  ? (translations?.imageResize.lockAspect ?? 'Aspect ratio locked')
                  : (translations?.imageResize.unlockAspect ?? 'Aspect ratio unlocked')}
                aria-label={lockAspect
                  ? (translations?.imageResize.unlockAspect ?? 'Unlock aspect ratio')
                  : (translations?.imageResize.lockAspect ?? 'Lock aspect ratio')}
              >
                {lockAspect ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                )}
              </button>

              {/* Height */}
              <div className="flex-1">
                <label className="mb-1 block text-xs text-fg-muted">{translations?.imageResize.height ?? 'Height'} (px)</label>
                <Input
                  type="number"
                  min={1}
                  value={height}
                  onChange={(e) => handleHeightChange(Number(e.target.value))}
                  className="tabular-nums"
                />
              </div>
            </div>

            {/* Presets */}
            <div className="mt-4">
              <p className="mb-2 text-xs text-fg-muted">{translations?.imageResize.presets ?? 'Presets'}</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p.w, p.h)}
                    className="rounded-md border border-edge px-3 py-1.5 text-xs font-medium text-fg-sec transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isProcessing && (
            <ProgressBar progress={overallProgress} label={translations?.imageResize.resizing ?? 'Resizing images...'} />
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 sticky bottom-4 z-40 rounded-xl bg-surface/80 p-3 backdrop-blur-sm sm:static sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            <Button
              onClick={handleResize}
              disabled={isProcessing || width <= 0 || height <= 0 || files.every((f) => f.status === 'done')}
            >
              {isProcessing
                ? (translations?.imageResize.resizing ?? 'Resizing...')
                : (translations?.imageResize.resizeBtn ?? 'Resize')}
            </Button>

            {doneFiles.length > 1 && (
              <DownloadButton
                onClick={() =>
                  downloadAll(doneFiles.map((f) => ({ blob: f.result!.blob, filename: f.result!.filename })))
                }
                label={translations?.common.downloadAll ?? 'Download All'}
                translations={translations ? { download: translations.common.downloadAll } : undefined}
              />
            )}

            {files.length > 0 && (
              <Button variant="ghost"
                onClick={clearFiles}
              >
                {translations?.common.clear ?? 'Clear'}
              </Button>
            )}
          </div>

          {/* Per-file download buttons */}
          {doneFiles.length > 0 && (
            <div className="space-y-2">
              {doneFiles.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-lg border border-edge-soft bg-surface px-4 py-2">
                  <span className="truncate text-sm text-fg-sec">{f.result!.filename}</span>
                  <DownloadButton
                    onClick={() => download(f.result!.blob, f.result!.filename)}
                    label={translations?.common.download ?? 'Download'}
                    translations={translations ? { download: translations.common.download } : undefined}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
