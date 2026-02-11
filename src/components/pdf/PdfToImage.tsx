import { useState, useEffect } from 'react';
import FileDropZone from '@components/shared/FileDropZone';
import ProgressBar from '@components/shared/ProgressBar';
import DownloadButton from '@components/shared/DownloadButton';
import { useDownload } from '@hooks/useDownload';
import { getPageCount, pdfToImages } from '@lib/pdf/toImage';
import type { PdfToImageOptions } from '@lib/pdf/toImage';
import { Button } from '@/components/ui/button';
import type { Translations } from '@/i18n/translations';

const ACCEPTED_TYPES = ['.pdf', 'application/pdf'];

interface PdfToImageProps {
  translations?: {
    common: Translations['common'];
    pdfToImage: Translations['pdfToImage'];
  };
}

export default function PdfToImage({ translations }: PdfToImageProps) {
  const { download, downloadAll } = useDownload();

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [format, setFormat] = useState<PdfToImageOptions['format']>('png');
  const [scale, setScale] = useState<number>(2);
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<Blob[]>([]);
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
    setResults([]);
    setError(null);

    try {
      const blobs = await pdfToImages(file, { format, scale }, setProgress);
      setResults(blobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while converting.');
    } finally {
      setProcessing(false);
    }
  };

  const ext = format === 'jpeg' ? 'jpg' : 'png';
  const baseName = file ? file.name.replace(/\.pdf$/i, '') : 'page';

  const handleDownloadPage = (index: number) => {
    download(results[index], `${baseName}-page-${index + 1}.${ext}`);
  };

  const handleDownloadAll = () => {
    const items = results.map((blob, i) => ({
      blob,
      filename: `${baseName}-page-${i + 1}.${ext}`,
    }));
    downloadAll(items);
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
        <div className="rounded-lg border border-edge bg-surface p-4">
          <p className="text-sm text-fg-sec">
            <span className="font-medium">{file.name}</span>
            {pageCount > 0 && (
              <span className="ml-2 text-fg-muted">
                ({translations?.pdfToImage.pageCount.replace('{n}', String(pageCount)) ?? `${pageCount} page${pageCount !== 1 ? 's' : ''}`})
              </span>
            )}
          </p>
        </div>
      )}

      {file && pageCount > 0 && (
        <>
          <div className="rounded-lg border border-edge bg-surface p-4 space-y-4">
            {/* Format select */}
            <div>
              <label htmlFor="format" className="mb-1 block text-sm font-medium text-fg-sec">
                {translations?.pdfToImage.format ?? 'Output format'}
              </label>
              <select
                id="format"
                value={format}
                onChange={(e) => setFormat(e.target.value as PdfToImageOptions['format'])}
                className="w-full rounded-lg border border-edge-input px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="png">PNG</option>
                <option value="jpeg">JPG</option>
              </select>
            </div>

            {/* Scale select */}
            <div>
              <label htmlFor="scale" className="mb-1 block text-sm font-medium text-fg-sec">
                {translations?.pdfToImage.scale ?? 'Scale'}
              </label>
              <select
                id="scale"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full rounded-lg border border-edge-input px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={3}>3x</option>
              </select>
            </div>
          </div>

          <div className="sticky bottom-4 z-40 rounded-xl bg-surface/80 p-3 backdrop-blur-sm sm:static sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <Button
            onClick={handleConvert}
            disabled={processing}
          >
            {processing
              ? (translations?.pdfToImage.converting ?? 'Converting...')
              : (translations?.pdfToImage.convertBtn ?? 'Convert to Images')}
          </Button>
          </div>
        </>
      )}

      {processing && (
        <ProgressBar progress={progress} label={translations?.pdfToImage.converting ?? 'Converting pages...'} />
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {results.length > 0 && !processing && (
        <div className="animate-fade-in rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4">
          <p className="mb-3 text-sm font-medium text-green-800 dark:text-green-200">
            {translations?.pdfToImage.success ?? 'All pages converted successfully!'}
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
            {results.map((_, i) => (
              <li key={i} className="flex items-center justify-between rounded border border-green-100 dark:border-green-900 bg-surface px-3 py-2">
                <span className="truncate text-sm text-fg-sec">
                  {translations?.pdfToImage.downloadPage.replace('{n}', String(i + 1)) ?? `Page ${i + 1}`}
                </span>
                <DownloadButton
                  onClick={() => handleDownloadPage(i)}
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
