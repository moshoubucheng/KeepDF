import { useState } from 'react';
import FileDropZone from '@components/shared/FileDropZone';
import FileList from '@components/shared/FileList';
import ProgressBar from '@components/shared/ProgressBar';
import DownloadButton from '@components/shared/DownloadButton';
import { useFileUpload } from '@hooks/useFileUpload';
import { useDownload } from '@hooks/useDownload';
import { mergePdfs } from '@lib/pdf/merge';
import { Button } from '@/components/ui/button';
import type { Translations } from '@/i18n/translations';

const ACCEPTED_TYPES = ['.pdf', 'application/pdf'];

interface MergePdfProps {
  translations?: {
    common: Translations['common'];
    pdfMerge: Translations['pdfMerge'];
  };
}

export default function MergePdf({ translations }: MergePdfProps) {
  const { files, addFiles, removeFile, moveFile } = useFileUpload(ACCEPTED_TYPES);
  const { download } = useDownload();

  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMerge = async () => {
    if (files.length < 2) return;

    setProcessing(true);
    setProgress(0);
    setResult(null);
    setError(null);

    try {
      const rawFiles = files.map((f) => f.file);
      const merged = await mergePdfs(rawFiles, setProgress);
      setResult(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while merging.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'application/pdf' });
    download(blob, translations?.pdfMerge.resultName ?? 'merged.pdf');
  };

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
        onMove={moveFile}
        translations={translations ? { moveUp: translations.common.moveUp, moveDown: translations.common.moveDown, remove: translations.common.remove, saved: translations.common.saved } : undefined}
      />

      {files.length >= 2 && (
        <div className="sticky bottom-4 z-40 rounded-xl bg-surface/80 p-3 backdrop-blur-sm sm:static sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <Button
            onClick={handleMerge}
            disabled={processing}
          >
            {processing
              ? (translations?.pdfMerge.merging ?? 'Merging...')
              : (translations?.pdfMerge.mergeBtn.replace('{n}', String(files.length)) ?? `Merge ${files.length} Files`)}
          </Button>
        </div>
      )}

      {processing && (
        <ProgressBar progress={progress} label={translations?.pdfMerge.merging ?? 'Merging PDF files...'} />
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {result && !processing && (
        <div className="animate-fade-in rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4">
          <p className="mb-3 text-sm font-medium text-green-800 dark:text-green-200">
            {translations?.pdfMerge.success ?? 'Merge complete! Your PDF is ready to download.'}
          </p>
          <DownloadButton
            onClick={handleDownload}
            label={`${translations?.common.download ?? 'Download'} ${translations?.pdfMerge.resultName ?? 'merged.pdf'}`}
            translations={translations ? { download: `${translations.common.download} ${translations.pdfMerge.resultName}` } : undefined}
          />
        </div>
      )}
    </div>
  );
}
