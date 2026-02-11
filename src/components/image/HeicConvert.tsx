import { useState, useCallback } from 'react';
import FileDropZone from '@components/shared/FileDropZone';
import FileList from '@components/shared/FileList';
import ProgressBar from '@components/shared/ProgressBar';
import DownloadButton from '@components/shared/DownloadButton';
import { useFileUpload } from '@hooks/useFileUpload';
import { useDownload } from '@hooks/useDownload';
import { convertHeic } from '@lib/image/heic';
import { Button } from '@/components/ui/button';
import type { Translations } from '@/i18n/translations';

const ACCEPTED = ['.heic', '.heif'];

interface HeicConvertProps {
  translations?: {
    common: Translations['common'];
    heicConvert: Translations['heicConvert'];
  };
}

export default function HeicConvert({ translations }: HeicConvertProps) {
  const { files, addFiles, removeFile, clearFiles, updateFile } = useFileUpload(ACCEPTED);
  const { download, downloadAll } = useDownload();
  const [format, setFormat] = useState<'image/jpeg' | 'image/png'>('image/jpeg');
  const [quality, setQuality] = useState(85);
  const [isProcessing, setIsProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  const handleConvert = useCallback(async () => {
    const pending = files.filter((f) => f.status === 'pending' || f.status === 'error');
    if (pending.length === 0) return;

    setIsProcessing(true);
    setOverallProgress(0);

    for (let i = 0; i < pending.length; i++) {
      const pf = pending[i];
      updateFile(pf.id, { status: 'processing', progress: 0 });

      try {
        const blob = await convertHeic(pf.file, format, quality / 100);
        const ext = format === 'image/jpeg' ? 'jpg' : 'png';
        const baseName = pf.name.slice(0, pf.name.lastIndexOf('.'));
        const filename = `${baseName}.${ext}`;

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
  }, [files, format, quality, updateFile]);

  const doneFiles = files.filter((f) => f.status === 'done' && f.result);

  return (
    <div className="space-y-6">
      <FileDropZone
        onFiles={addFiles}
        accept={ACCEPTED}
        multiple
        label="Drop HEIC/HEIF files here or click to browse"
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

          {/* Options */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Format */}
            <div className="rounded-lg border border-edge bg-surface p-4">
              <label className="mb-2 block text-sm font-medium text-fg-sec">
                {translations?.heicConvert.targetFormat ?? 'Target format'}
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'image/jpeg' | 'image/png')}
                className="w-full rounded-lg border border-edge-input px-3 py-2.5 text-sm"
              >
                <option value="image/jpeg">JPG</option>
                <option value="image/png">PNG</option>
              </select>
            </div>

            {/* Quality (JPG only) */}
            {format === 'image/jpeg' && (
              <div className="rounded-lg border border-edge bg-surface p-4">
                <label className="mb-2 flex items-center justify-between text-sm font-medium text-fg-sec">
                  <span>{translations?.heicConvert.quality ?? 'Quality (JPG)'}</span>
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
              </div>
            )}
          </div>

          {isProcessing && (
            <ProgressBar progress={overallProgress} label={translations?.heicConvert.converting ?? 'Converting HEIC files...'} />
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 sticky bottom-4 z-40 rounded-xl bg-surface/80 p-3 backdrop-blur-sm sm:static sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            <Button
              onClick={handleConvert}
              disabled={isProcessing || files.every((f) => f.status === 'done')}
            >
              {isProcessing
                ? (translations?.heicConvert.converting ?? 'Converting...')
                : (translations?.heicConvert.convertAll ?? 'Convert All')}
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
