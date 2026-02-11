import { useState } from 'react';
import FileDropZone from '@components/shared/FileDropZone';
import ProgressBar from '@components/shared/ProgressBar';
import DownloadButton from '@components/shared/DownloadButton';
import { useDownload } from '@hooks/useDownload';
import { wordToPdf } from '@lib/doc/wordToPdf';
import { Button } from '@/components/ui/button';
import type { Translations } from '@/i18n/translations';

const ACCEPTED_TYPES = ['.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

interface WordToPdfProps {
  translations?: {
    common: Translations['common'];
    wordToPdf: Translations['wordToPdf'];
  };
}

export default function WordToPdf({ translations }: WordToPdfProps) {
  const { download } = useDownload();

  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = (newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles);
    const docx = arr.find(
      (f) => f.name.toLowerCase().endsWith('.docx') || f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    if (docx) {
      setFile(docx);
      setResult(null);
      setError(null);
    }
  };

  const handleConvert = async () => {
    if (!file) return;

    setProcessing(true);
    setProgress(0);
    setResult(null);
    setError(null);

    try {
      const blob = await wordToPdf(file, setProgress);
      setResult(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while converting.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const baseName = file ? file.name.replace(/\.docx$/i, '') : 'document';
    download(result, `${baseName}.pdf`);
  };

  const handleClear = () => {
    setFile(null);
    setProgress(0);
    setProcessing(false);
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <FileDropZone
        onFiles={handleFiles}
        accept={ACCEPTED_TYPES}
        multiple={false}
        label="Drop a Word file (.docx) here or click to browse"
        translations={translations ? { dropFiles: translations.common.dropFile, supported: translations.common.supported } : undefined}
      />

      {file && (
        <div className="rounded-lg border border-edge bg-surface p-4 flex items-center justify-between">
          <p className="text-sm text-fg-sec">
            <span className="font-medium">{file.name}</span>
            <span className="ml-2 text-fg-muted">
              ({(file.size / 1024).toFixed(1)} KB)
            </span>
          </p>
          <button
            onClick={handleClear}
            className="text-sm text-fg-muted hover:text-fg-sec transition-colors"
          >
            {translations?.common.clear ?? 'Clear'}
          </button>
        </div>
      )}

      {file && !result && (
        <>
          <p className="text-xs text-fg-muted">
            {translations?.wordToPdf.note ?? 'The Word document will be converted to HTML first, then rendered as PDF. Complex layouts may vary slightly.'}
          </p>

          <div className="sticky bottom-4 z-40 rounded-xl bg-surface/80 p-3 backdrop-blur-sm sm:static sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            <Button
              onClick={handleConvert}
              disabled={processing}
            >
              {processing
                ? (translations?.wordToPdf.converting ?? 'Converting to PDF...')
                : (translations?.wordToPdf.convertBtn ?? 'Convert to PDF')}
            </Button>
          </div>
        </>
      )}

      {processing && (
        <ProgressBar progress={progress} label={translations?.wordToPdf.converting ?? 'Converting to PDF...'} />
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {result && !processing && (
        <div className="animate-fade-in rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4">
          <p className="mb-3 text-sm font-medium text-green-800 dark:text-green-200">
            {translations?.common.done ?? 'Done'}
          </p>
          <DownloadButton
            onClick={handleDownload}
            label={`${translations?.common.download ?? 'Download'} ${translations?.wordToPdf.resultName ?? 'document.pdf'}`}
            translations={translations ? { download: `${translations.common.download} ${translations.wordToPdf.resultName}` } : undefined}
          />
        </div>
      )}
    </div>
  );
}
