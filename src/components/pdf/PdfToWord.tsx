import { useState, useEffect } from 'react';
import FileDropZone from '@components/shared/FileDropZone';
import ProgressBar from '@components/shared/ProgressBar';
import DownloadButton from '@components/shared/DownloadButton';
import { useDownload } from '@hooks/useDownload';
import { getPageCount, pdfToWord } from '@lib/pdf/toWord';
import { Button } from '@/components/ui/button';
import type { Translations } from '@/i18n/translations';

const ACCEPTED_TYPES = ['.pdf', 'application/pdf'];

interface PdfToWordProps {
  translations?: {
    common: Translations['common'];
    pdfToWord: Translations['pdfToWord'];
  };
}

export default function PdfToWord({ translations }: PdfToWordProps) {
  const { download } = useDownload();

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = (newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles);
    const pdf = arr.find(
      (f) => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf',
    );
    if (pdf) {
      setFile(pdf);
      setResult(null);
      setError(null);
    }
  };

  useEffect(() => {
    if (!file) {
      setPageCount(0);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const count = await getPageCount(file);
        if (!cancelled) setPageCount(count);
      } catch {
        if (!cancelled) {
          setPageCount(0);
          setError('Failed to read PDF. The file may be corrupted.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file]);

  const handleConvert = async () => {
    if (!file || pageCount === 0) return;

    setProcessing(true);
    setProgress(0);
    setResult(null);
    setError(null);

    try {
      const blob = await pdfToWord(file, setProgress);
      setResult(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while converting.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const baseName = file ? file.name.replace(/\.pdf$/i, '') : 'document';
    download(result, `${baseName}.docx`);
  };

  const handleClear = () => {
    setFile(null);
    setPageCount(0);
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
        label="Drop a PDF file here or click to browse"
        translations={translations ? { dropFiles: translations.common.dropFile, supported: translations.common.supported } : undefined}
      />

      {file && (
        <div className="rounded-lg border border-edge bg-surface p-4 flex items-center justify-between">
          <p className="text-sm text-fg-sec">
            <span className="font-medium">{file.name}</span>
            {pageCount > 0 && (
              <span className="ml-2 text-fg-muted">
                ({pageCount} {translations?.pdfToWord.pageCount ?? `page${pageCount !== 1 ? 's' : ''}`})
              </span>
            )}
          </p>
          <Button
            variant="ghost"
            onClick={handleClear}
          >
            {translations?.common.clear ?? 'Clear'}
          </Button>
        </div>
      )}

      {file && pageCount > 0 && !result && (
        <>
          <p className="text-xs text-fg-muted">
            {translations?.pdfToWord.note ?? 'Text content will be extracted. Complex layouts and images may not be preserved.'}
          </p>

          <div className="sticky bottom-4 z-40 rounded-xl bg-surface/80 p-3 backdrop-blur-sm sm:static sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <Button
            onClick={handleConvert}
            disabled={processing}
          >
            {processing
              ? (translations?.pdfToWord.converting ?? 'Converting to Word...')
              : (translations?.pdfToWord.convertBtn ?? 'Convert to Word')}
          </Button>
          </div>
        </>
      )}

      {processing && (
        <ProgressBar progress={progress} label={translations?.pdfToWord.converting ?? 'Converting to Word...'} />
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
            label={`${translations?.common.download ?? 'Download'} ${translations?.pdfToWord.resultName ?? 'document.docx'}`}
            translations={translations ? { download: `${translations.common.download} ${translations.pdfToWord.resultName}` } : undefined}
          />
        </div>
      )}
    </div>
  );
}
