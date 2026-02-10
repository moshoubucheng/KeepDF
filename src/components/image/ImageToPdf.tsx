import { useState, useCallback } from 'react';
import FileDropZone from '@components/shared/FileDropZone';
import FileList from '@components/shared/FileList';
import ProgressBar from '@components/shared/ProgressBar';
import DownloadButton from '@components/shared/DownloadButton';
import { useFileUpload } from '@hooks/useFileUpload';
import { useDownload } from '@hooks/useDownload';
import { imagesToPdf } from '@lib/image/toPdf';
import type { Translations } from '@/i18n/translations';

const ACCEPTED = ['.png', '.jpg', '.jpeg', '.webp', 'image/png', 'image/jpeg', 'image/webp'];

interface ImageToPdfProps {
  translations?: {
    common: Translations['common'];
    imageToPdf: Translations['imageToPdf'];
  };
}

export default function ImageToPdf({ translations }: ImageToPdfProps) {
  const { files, addFiles, removeFile, clearFiles, moveFile } = useFileUpload(ACCEPTED);
  const { download } = useDownload();

  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [fitMode, setFitMode] = useState<'fit' | 'fill'>('fit');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);

  const handleConvert = useCallback(async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    setResult(null);

    try {
      const blob = await imagesToPdf(
        files.map((f) => f.file),
        {
          pageSize,
          orientation,
          fitMode,
          onProgress: setProgress,
        },
      );
      const filename = translations?.imageToPdf.resultName ?? 'images.pdf';
      setResult({ blob, filename });
    } catch {
      // silently fail
    } finally {
      setIsProcessing(false);
    }
  }, [files, pageSize, orientation, fitMode, translations]);

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
            onMove={moveFile}
            translations={translations ? { moveUp: translations.common.moveUp, moveDown: translations.common.moveDown, remove: translations.common.remove } : undefined}
          />

          {/* Options */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Page Size */}
            <div className="rounded-lg border border-edge bg-surface p-4">
              <label className="mb-2 block text-sm font-medium text-fg-sec">
                {translations?.imageToPdf.pageSize ?? 'Page size'}
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as 'a4' | 'letter')}
                className="w-full rounded-lg border border-edge-input px-3 py-2.5 text-sm"
              >
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
              </select>
            </div>

            {/* Orientation */}
            <div className="rounded-lg border border-edge bg-surface p-4">
              <label className="mb-2 block text-sm font-medium text-fg-sec">
                {translations?.imageToPdf.orientation ?? 'Orientation'}
              </label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as 'portrait' | 'landscape')}
                className="w-full rounded-lg border border-edge-input px-3 py-2.5 text-sm"
              >
                <option value="portrait">{translations?.imageToPdf.portrait ?? 'Portrait'}</option>
                <option value="landscape">{translations?.imageToPdf.landscape ?? 'Landscape'}</option>
              </select>
            </div>

            {/* Fit Mode */}
            <div className="rounded-lg border border-edge bg-surface p-4">
              <label className="mb-2 block text-sm font-medium text-fg-sec">
                {translations?.imageToPdf.fitMode ?? 'Fit mode'}
              </label>
              <select
                value={fitMode}
                onChange={(e) => setFitMode(e.target.value as 'fit' | 'fill')}
                className="w-full rounded-lg border border-edge-input px-3 py-2.5 text-sm"
              >
                <option value="fit">{translations?.imageToPdf.fit ?? 'Fit (keep ratio)'}</option>
                <option value="fill">{translations?.imageToPdf.fill ?? 'Fill page'}</option>
              </select>
            </div>
          </div>

          {isProcessing && (
            <ProgressBar progress={progress} label={translations?.imageToPdf.converting ?? 'Converting to PDF...'} />
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 sticky bottom-4 z-40 rounded-xl bg-surface/80 p-3 backdrop-blur-sm sm:static sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            <button
              onClick={handleConvert}
              disabled={isProcessing || files.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing
                ? (translations?.imageToPdf.converting ?? 'Converting...')
                : (translations?.imageToPdf.convertBtn ?? 'Convert to PDF')}
            </button>

            {result && (
              <DownloadButton
                onClick={() => download(result.blob, result.filename)}
                label={translations?.common.download ?? 'Download'}
                translations={translations ? { download: translations.common.download } : undefined}
              />
            )}

            <button
              onClick={() => { clearFiles(); setResult(null); }}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-fg-sec transition-colors hover:bg-hover-strong"
            >
              {translations?.common.clear ?? 'Clear'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
