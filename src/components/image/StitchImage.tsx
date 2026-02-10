import { useState, useCallback } from 'react';
import FileDropZone from '@components/shared/FileDropZone';
import FileList from '@components/shared/FileList';
import ProgressBar from '@components/shared/ProgressBar';
import DownloadButton from '@components/shared/DownloadButton';
import { useFileUpload } from '@hooks/useFileUpload';
import { useDownload } from '@hooks/useDownload';
import { stitchImages } from '@lib/image/stitch';
import type { Translations } from '@/i18n/translations';

const ACCEPTED = ['.png', '.jpg', '.jpeg', '.webp', 'image/png', 'image/jpeg', 'image/webp'];

interface StitchImageProps {
  translations?: {
    common: Translations['common'];
    imageStitch: Translations['imageStitch'];
  };
}

export default function StitchImage({ translations }: StitchImageProps) {
  const { files, addFiles, removeFile, clearFiles, moveFile } = useFileUpload(ACCEPTED);
  const { download } = useDownload();
  const [direction, setDirection] = useState<'vertical' | 'horizontal'>('vertical');
  const [align, setAlign] = useState<'start' | 'center' | 'end'>('start');
  const [spacing, setSpacing] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);

  const handleStitch = useCallback(async () => {
    if (files.length < 2) return;

    setIsProcessing(true);
    setProgress(0);
    setResult(null);

    try {
      setProgress(50);
      const blob = await stitchImages(
        files.map((f) => f.file),
        { direction, align, spacing },
      );
      const filename = translations?.imageStitch.resultName ?? 'stitched.png';
      setResult({ blob, filename });
      setProgress(100);
    } catch {
      // silently fail
    } finally {
      setIsProcessing(false);
    }
  }, [files, direction, align, spacing, translations]);

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
            {/* Direction */}
            <div className="rounded-lg border border-edge bg-surface p-4">
              <label className="mb-2 block text-sm font-medium text-fg-sec">
                {translations?.imageStitch.direction ?? 'Direction'}
              </label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as 'vertical' | 'horizontal')}
                className="w-full rounded-lg border border-edge-input px-3 py-2.5 text-sm"
              >
                <option value="vertical">{translations?.imageStitch.vertical ?? 'Vertical'}</option>
                <option value="horizontal">{translations?.imageStitch.horizontal ?? 'Horizontal'}</option>
              </select>
            </div>

            {/* Alignment */}
            <div className="rounded-lg border border-edge bg-surface p-4">
              <label className="mb-2 block text-sm font-medium text-fg-sec">
                {translations?.imageStitch.align ?? 'Alignment'}
              </label>
              <select
                value={align}
                onChange={(e) => setAlign(e.target.value as 'start' | 'center' | 'end')}
                className="w-full rounded-lg border border-edge-input px-3 py-2.5 text-sm"
              >
                <option value="start">{translations?.imageStitch.alignStart ?? 'Start'}</option>
                <option value="center">{translations?.imageStitch.alignCenter ?? 'Center'}</option>
                <option value="end">{translations?.imageStitch.alignEnd ?? 'End'}</option>
              </select>
            </div>

            {/* Spacing */}
            <div className="rounded-lg border border-edge bg-surface p-4">
              <label className="mb-2 block text-sm font-medium text-fg-sec">
                {translations?.imageStitch.spacing ?? 'Spacing (px)'}
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={spacing}
                onChange={(e) => setSpacing(Math.min(50, Math.max(0, Number(e.target.value))))}
                className="w-full rounded-lg border border-edge-input px-3 py-2.5 text-sm"
              />
            </div>
          </div>

          {files.length < 2 && (
            <p className="text-sm text-amber-600">
              {translations?.imageStitch.needTwo ?? 'Add at least 2 images to stitch.'}
            </p>
          )}

          {isProcessing && (
            <ProgressBar progress={progress} label={translations?.imageStitch.stitching ?? 'Stitching images...'} />
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 sticky bottom-4 z-40 rounded-xl bg-surface/80 p-3 backdrop-blur-sm sm:static sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            <button
              onClick={handleStitch}
              disabled={isProcessing || files.length < 2}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing
                ? (translations?.imageStitch.stitching ?? 'Stitching...')
                : (translations?.imageStitch.stitchBtn ?? 'Stitch Images')}
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
