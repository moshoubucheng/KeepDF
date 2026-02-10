import { useState, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import FileDropZone from '@components/shared/FileDropZone';
import ProgressBar from '@components/shared/ProgressBar';
import DownloadButton from '@components/shared/DownloadButton';
import { useDownload } from '@hooks/useDownload';
import { splitPdf } from '@lib/pdf/split';
import type { Translations } from '@/i18n/translations';

const ACCEPTED_TYPES = ['.pdf', 'application/pdf'];

type SplitMode = 'all' | 'ranges' | 'extract';

interface SplitPdfProps {
  translations?: {
    common: Translations['common'];
    pdfSplit: Translations['pdfSplit'];
  };
}

export default function SplitPdf({ translations }: SplitPdfProps) {
  const { download, downloadAll } = useDownload();

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [mode, setMode] = useState<SplitMode>('all');
  const [rangeInput, setRangeInput] = useState('');
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<{ filename: string; data: Uint8Array }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = (newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles);
    const pdf = arr.find(
      (f) => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf',
    );
    if (pdf) {
      setFile(pdf);
      setResults([]);
      setError(null);
    }
  };

  // Load page count when file changes
  useEffect(() => {
    if (!file) {
      setPageCount(0);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        if (!cancelled) {
          setPageCount(doc.getPageCount());
        }
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

  const handleSplit = async () => {
    if (!file) return;

    setProcessing(true);
    setProgress(0);
    setResults([]);
    setError(null);

    try {
      const output = await splitPdf(file, mode, rangeInput, setProgress);
      setResults(output);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while splitting.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadSingle = (item: { filename: string; data: Uint8Array }) => {
    const blob = new Blob([item.data], { type: 'application/pdf' });
    download(blob, item.filename);
  };

  const handleDownloadAll = () => {
    const items = results.map((r) => ({
      blob: new Blob([r.data], { type: 'application/pdf' }),
      filename: r.filename,
    }));
    downloadAll(items);
  };

  const canSplit =
    file &&
    pageCount > 0 &&
    (mode === 'all' || rangeInput.trim().length > 0);

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
        <div className="rounded-lg border border-edge bg-surface p-4">
          <p className="text-sm text-fg-sec">
            <span className="font-medium">{file.name}</span>
            {pageCount > 0 && (
              <span className="ml-2 text-fg-muted">({translations?.pdfSplit.pageCount.replace('{n}', String(pageCount)) ?? `${pageCount} page${pageCount !== 1 ? 's' : ''}`})</span>
            )}
          </p>
        </div>
      )}

      {file && pageCount > 0 && (
        <>
          {/* Mode selector */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-fg-sec">Split mode</legend>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
              <label className="flex items-center gap-2 text-sm text-fg-sec cursor-pointer">
                <input
                  type="radio"
                  name="splitMode"
                  value="all"
                  checked={mode === 'all'}
                  onChange={() => setMode('all')}
                  className="text-brand-600 focus:ring-brand-500"
                />
                {translations?.pdfSplit.modeAll ?? 'Split every page'}
              </label>
              <label className="flex items-center gap-2 text-sm text-fg-sec cursor-pointer">
                <input
                  type="radio"
                  name="splitMode"
                  value="ranges"
                  checked={mode === 'ranges'}
                  onChange={() => setMode('ranges')}
                  className="text-brand-600 focus:ring-brand-500"
                />
                {translations?.pdfSplit.modeRanges ?? 'Split by ranges'}
              </label>
              <label className="flex items-center gap-2 text-sm text-fg-sec cursor-pointer">
                <input
                  type="radio"
                  name="splitMode"
                  value="extract"
                  checked={mode === 'extract'}
                  onChange={() => setMode('extract')}
                  className="text-brand-600 focus:ring-brand-500"
                />
                {translations?.pdfSplit.modeExtract ?? 'Extract pages'}
              </label>
            </div>
          </fieldset>

          {/* Range input */}
          {(mode === 'ranges' || mode === 'extract') && (
            <div>
              <label htmlFor="rangeInput" className="mb-1 block text-sm font-medium text-fg-sec">
                {translations?.pdfSplit.rangeLabel ?? 'Page ranges'}
              </label>
              <input
                id="rangeInput"
                type="text"
                value={rangeInput}
                onChange={(e) => setRangeInput(e.target.value)}
                placeholder={translations?.pdfSplit.rangePlaceholder ?? 'e.g. 1-3, 5, 7-9'}
                className="w-full rounded-lg border border-edge-input px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <p className="mt-1 text-xs text-fg-muted">
                {mode === 'ranges'
                  ? 'Each comma-separated segment creates a separate PDF.'
                  : 'All specified pages are combined into a single PDF.'}
              </p>
            </div>
          )}

          {/* Split button */}
          <div className="sticky bottom-4 z-40 rounded-xl bg-surface/80 p-3 backdrop-blur-sm sm:static sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <button
            onClick={handleSplit}
            disabled={processing || !canSplit}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processing
              ? (translations?.pdfSplit.splitting ?? 'Splitting...')
              : (translations?.pdfSplit.splitBtn ?? 'Split PDF')}
          </button>
          </div>
        </>
      )}

      {processing && (
        <ProgressBar progress={progress} label={translations?.pdfSplit.splitting ?? 'Splitting PDF...'} />
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {results.length > 0 && !processing && (
        <div className="animate-fade-in rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4">
          <p className="mb-3 text-sm font-medium text-green-800 dark:text-green-200">
            Split complete! {results.length} file{results.length !== 1 ? 's' : ''} ready to download.
          </p>

          {results.length > 1 && (
            <div className="mb-3">
              <DownloadButton
                onClick={handleDownloadAll}
                label={translations?.common.downloadAll ?? 'Download All'}
                translations={translations ? { download: translations.common.downloadAll } : undefined}
              />
            </div>
          )}

          <ul className="space-y-2">
            {results.map((r) => (
              <li key={r.filename} className="flex items-center justify-between rounded border border-green-100 dark:border-green-900 bg-surface px-3 py-2">
                <span className="truncate text-sm text-fg-sec">{r.filename}</span>
                <DownloadButton
                  onClick={() => handleDownloadSingle(r)}
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
