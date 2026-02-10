import { useState } from 'react';
import FileDropZone from '@components/shared/FileDropZone';
import FileList from '@components/shared/FileList';
import ProgressBar from '@components/shared/ProgressBar';
import DownloadButton from '@components/shared/DownloadButton';
import { useFileUpload } from '@hooks/useFileUpload';
import { useDownload } from '@hooks/useDownload';
import { compressPdf } from '@lib/pdf/compress';
import { formatFileSize } from '@lib/utils/fileHelpers';
import type { ProcessingResult } from '@types/file';
import type { Translations } from '@/i18n/translations';

const ACCEPTED_TYPES = ['.pdf', 'application/pdf'];

interface CompressPdfProps {
  translations?: {
    common: Translations['common'];
    pdfCompress: Translations['pdfCompress'];
  };
}

export default function CompressPdf({ translations }: CompressPdfProps) {
  const { files, addFiles, removeFile, updateFile } = useFileUpload(ACCEPTED_TYPES);
  const { download } = useDownload();

  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleCompress = async () => {
    const pending = files.filter((f) => f.status === 'pending');
    if (pending.length === 0) return;

    setProcessing(true);
    setProgress(0);

    for (let i = 0; i < pending.length; i++) {
      const pf = pending[i];
      setCurrentIndex(i);
      updateFile(pf.id, { status: 'processing', progress: 0 });

      try {
        const compressed = await compressPdf(pf.file, (p) => {
          const overall = Math.round(((i + p / 100) / pending.length) * 100);
          setProgress(overall);
          updateFile(pf.id, { progress: p });
        });

        const result: ProcessingResult = {
          blob: new Blob([compressed], { type: 'application/pdf' }),
          filename: pf.name.replace(/\.pdf$/i, '_compressed.pdf'),
          originalSize: pf.size,
          resultSize: compressed.byteLength,
        };

        updateFile(pf.id, { status: 'done', progress: 100, result });
      } catch (err) {
        updateFile(pf.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Compression failed.',
        });
      }
    }

    setProgress(100);
    setProcessing(false);
  };

  const handleDownload = (result: ProcessingResult) => {
    download(result.blob, result.filename);
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const doneFiles = files.filter((f) => f.status === 'done' && f.result);

  return (
    <div className="space-y-6">
      <FileDropZone
        onFiles={addFiles}
        accept={ACCEPTED_TYPES}
        multiple={true}
        label="Drop PDF files here or click to browse"
        translations={translations ? { dropFiles: translations.common.dropFiles, supported: translations.common.supported } : undefined}
      />

      <FileList
        files={files}
        onRemove={removeFile}
        showResult={true}
        translations={translations ? { moveUp: translations.common.moveUp, moveDown: translations.common.moveDown, remove: translations.common.remove, saved: translations.common.saved } : undefined}
      />

      {pendingCount > 0 && (
        <div className="sticky bottom-4 z-40 rounded-xl bg-surface/80 p-3 backdrop-blur-sm sm:static sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <button
          onClick={handleCompress}
          disabled={processing}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {processing
            ? (translations?.pdfCompress.compressing ?? `Compressing (${currentIndex + 1}/${files.filter((f) => f.status !== 'done').length})...`)
            : (pendingCount === 1
              ? (translations?.pdfCompress.compressBtn ?? 'Compress')
              : (translations?.pdfCompress.compressAll ?? `Compress ${pendingCount} Files`))}
        </button>
        </div>
      )}

      {processing && (
        <ProgressBar progress={progress} label={translations?.pdfCompress.compressing ?? 'Compressing PDF files...'} />
      )}

      {/* Info note */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          {translations?.pdfCompress.limitation ?? 'Note: Browser-based compression optimizes PDF structure and removes metadata, but cannot recompress embedded images. For maximum compression, consider using a desktop tool for image-heavy PDFs.'}
        </p>
      </div>

      {/* Download buttons for completed files */}
      {doneFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-fg-sec">Compressed files</h3>
          <ul className="space-y-2">
            {doneFiles.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between rounded-lg border border-edge bg-surface px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">
                    {f.result!.filename}
                  </p>
                  <p className="text-xs text-fg-muted">
                    {formatFileSize(f.result!.originalSize)} &rarr;{' '}
                    {formatFileSize(f.result!.resultSize)}{' '}
                    <span className="text-green-600 dark:text-green-400">
                      ({Math.round((1 - f.result!.resultSize / f.result!.originalSize) * 100)}%
                      {translations?.common.saved ?? 'saved'})
                    </span>
                  </p>
                </div>
                <DownloadButton
                  onClick={() => handleDownload(f.result!)}
                  label={translations?.common.download ?? 'Download'}
                  translations={translations ? { download: translations.common.download } : undefined}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
