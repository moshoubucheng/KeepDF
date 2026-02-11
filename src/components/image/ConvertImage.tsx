import { useState, useCallback } from 'react';
import FileDropZone from '@components/shared/FileDropZone';
import FileList from '@components/shared/FileList';
import ProgressBar from '@components/shared/ProgressBar';
import DownloadButton from '@components/shared/DownloadButton';
import { useFileUpload } from '@hooks/useFileUpload';
import { useDownload } from '@hooks/useDownload';
import { convertImage } from '@lib/image/convert';
import { replaceExtension } from '@lib/utils/fileHelpers';
import { Button } from '@/components/ui/button';
import type { Translations } from '@/i18n/translations';

const ACCEPTED = ['.png', '.jpg', '.jpeg', '.webp', 'image/png', 'image/jpeg', 'image/webp'];

type TargetFormat = 'png' | 'jpeg' | 'webp';

const FORMAT_OPTIONS: { value: TargetFormat; label: string; ext: string }[] = [
  { value: 'png', label: 'PNG', ext: 'png' },
  { value: 'jpeg', label: 'JPG', ext: 'jpg' },
  { value: 'webp', label: 'WebP', ext: 'webp' },
];

interface ConvertImageProps {
  translations?: {
    common: Translations['common'];
    imageConvert: Translations['imageConvert'];
  };
}

export default function ConvertImage({ translations }: ConvertImageProps) {
  const { files, addFiles, removeFile, clearFiles, updateFile } = useFileUpload(ACCEPTED);
  const { download, downloadAll } = useDownload();
  const [targetFormat, setTargetFormat] = useState<TargetFormat>('png');
  const [quality, setQuality] = useState(92);
  const [isProcessing, setIsProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  const showQuality = targetFormat === 'jpeg' || targetFormat === 'webp';

  const handleConvert = useCallback(async () => {
    const pending = files.filter((f) => f.status === 'pending' || f.status === 'error');
    if (pending.length === 0) return;

    setIsProcessing(true);
    setOverallProgress(0);

    const ext = FORMAT_OPTIONS.find((o) => o.value === targetFormat)!.ext;

    for (let i = 0; i < pending.length; i++) {
      const pf = pending[i];
      updateFile(pf.id, { status: 'processing', progress: 0 });

      try {
        const blob = await convertImage(pf.file, targetFormat, quality / 100);
        const filename = replaceExtension(pf.name, ext);

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
          error: err instanceof Error ? err.message : 'Conversion failed',
        });
      }

      setOverallProgress(Math.round(((i + 1) / pending.length) * 100));
    }

    setIsProcessing(false);
  }, [files, targetFormat, quality, updateFile]);

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

          {/* Format selector */}
          <div className="rounded-lg border border-edge bg-surface p-4">
            <p className="mb-3 text-sm font-medium text-fg-sec">{translations?.imageConvert.targetFormat ?? 'Output Format'}</p>
            <div className="flex gap-2">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTargetFormat(opt.value)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    targetFormat === opt.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-edge bg-surface text-fg-sec hover:border-edge-input'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Quality slider -- only for JPEG and WebP */}
            {showQuality && (
              <div className="mt-4">
                <label className="mb-2 flex items-center justify-between text-sm font-medium text-fg-sec">
                  <span>{translations?.imageConvert.quality ?? 'Quality'}</span>
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
                  <span>Smaller file</span>
                  <span>Higher quality</span>
                </div>
              </div>
            )}
          </div>

          {isProcessing && (
            <ProgressBar progress={overallProgress} label={translations?.imageConvert.converting ?? 'Converting images...'} />
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 sticky bottom-4 z-40 rounded-xl bg-surface/80 p-3 backdrop-blur-sm sm:static sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            <Button
              onClick={handleConvert}
              disabled={isProcessing || files.every((f) => f.status === 'done')}
            >
              {isProcessing
                ? (translations?.imageConvert.converting ?? 'Converting...')
                : (translations?.imageConvert.convertAll ?? 'Convert All')}
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
