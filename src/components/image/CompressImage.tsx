import { useState, useCallback } from 'react';
import FileDropZone from '@components/shared/FileDropZone';
import FileList from '@components/shared/FileList';
import ProgressBar from '@components/shared/ProgressBar';
import DownloadButton from '@components/shared/DownloadButton';
import { useFileUpload } from '@hooks/useFileUpload';
import { useDownload } from '@hooks/useDownload';
import { compressImage } from '@lib/image/compress';
import { formatFileSize } from '@lib/utils/fileHelpers';
import type { Translations } from '@/i18n/translations';

const ACCEPTED = ['.png', '.jpg', '.jpeg', '.webp', 'image/png', 'image/jpeg', 'image/webp'];

interface CompressImageProps {
  translations?: {
    common: Translations['common'];
    imageCompress: Translations['imageCompress'];
  };
}

export default function CompressImage({ translations }: CompressImageProps) {
  const { files, addFiles, removeFile, clearFiles, updateFile } = useFileUpload(ACCEPTED);
  const { download, downloadAll } = useDownload();
  const [quality, setQuality] = useState(80);
  const [isProcessing, setIsProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  const handleCompress = useCallback(async () => {
    const pending = files.filter((f) => f.status === 'pending' || f.status === 'error');
    if (pending.length === 0) return;

    setIsProcessing(true);
    setOverallProgress(0);

    for (let i = 0; i < pending.length; i++) {
      const pf = pending[i];
      updateFile(pf.id, { status: 'processing', progress: 0 });

      try {
        const blob = await compressImage(pf.file, quality / 100);
        const ext = blob.type === 'image/webp' ? 'webp' : pf.name.split('.').pop() || 'webp';
        const baseName = pf.name.slice(0, pf.name.lastIndexOf('.'));
        const filename = `${baseName}-compressed.${ext}`;

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
          error: err instanceof Error ? err.message : 'Compression failed',
        });
      }

      setOverallProgress(Math.round(((i + 1) / pending.length) * 100));
    }

    setIsProcessing(false);
  }, [files, quality, updateFile]);

  const doneFiles = files.filter((f) => f.status === 'done' && f.result);

  const totalOriginal = doneFiles.reduce((sum, f) => sum + f.result!.originalSize, 0);
  const totalResult = doneFiles.reduce((sum, f) => sum + f.result!.resultSize, 0);
  const totalSaved = totalOriginal - totalResult;
  const savingsPercent = totalOriginal > 0 ? Math.round((totalSaved / totalOriginal) * 100) : 0;

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

          {/* Quality slider */}
          <div className="rounded-lg border border-edge bg-surface p-4">
            <label className="mb-2 flex items-center justify-between text-sm font-medium text-fg-sec">
              <span>{translations?.imageCompress.quality ?? 'Quality'}</span>
              <span className="tabular-nums text-brand-600">{quality}%</span>
            </label>
            <input
              type="range"
              min={1}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-brand-600"
            />
            <div className="mt-1 flex justify-between text-xs text-fg-faint">
              <span>{translations?.imageCompress.smaller ?? 'Smaller file'}</span>
              <span>{translations?.imageCompress.higher ?? 'Higher quality'}</span>
            </div>
          </div>

          {isProcessing && (
            <ProgressBar progress={overallProgress} label={translations?.imageCompress.compressing ?? 'Compressing images...'} />
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 sticky bottom-4 z-40 rounded-xl bg-surface/80 p-3 backdrop-blur-sm sm:static sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            <button
              onClick={handleCompress}
              disabled={isProcessing || files.every((f) => f.status === 'done')}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing
                ? (translations?.imageCompress.compressing ?? 'Compressing...')
                : (translations?.imageCompress.compressAll ?? 'Compress All')}
            </button>

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
              <button
                onClick={clearFiles}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-fg-sec transition-colors hover:bg-hover-strong"
              >
                {translations?.common.clear ?? 'Clear'}
              </button>
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

          {/* Savings summary */}
          {doneFiles.length > 0 && (
            <div className="animate-fade-in rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4 text-sm text-green-800 dark:text-green-200">
              <p className="font-medium">
                {translations?.imageCompress.totalSaved ?? 'Total saved'}: {formatFileSize(totalSaved)} ({savingsPercent}% reduction)
              </p>
              <p className="mt-1 text-green-600 dark:text-green-400">
                {formatFileSize(totalOriginal)} &rarr; {formatFileSize(totalResult)} across {doneFiles.length} file{doneFiles.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
