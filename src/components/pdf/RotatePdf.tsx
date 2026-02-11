import { useState, useEffect } from 'react';
import FileDropZone from '@components/shared/FileDropZone';
import DownloadButton from '@components/shared/DownloadButton';
import { useDownload } from '@hooks/useDownload';
import { rotatePdf, parsePageRanges, type RotationAngle } from '@lib/pdf/rotatePdf';
import type { Translations } from '@/i18n/translations';
import { PDFDocument } from 'pdf-lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ACCEPTED_TYPES = ['.pdf', 'application/pdf'];

interface RotatePdfProps {
  translations?: {
    common: Translations['common'];
    pdfRotate: Translations['pdfRotate'];
  };
}

export default function RotatePdf({ translations }: RotatePdfProps) {
  const { download } = useDownload();

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [angle, setAngle] = useState<RotationAngle>(90);
  const [mode, setMode] = useState<'all' | 'specific'>('all');
  const [pageRange, setPageRange] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tr = translations?.pdfRotate;
  const common = translations?.common;

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
        const data = new Uint8Array(await file.arrayBuffer());
        const doc = await PDFDocument.load(data);
        if (!cancelled) setPageCount(doc.getPageCount());
      } catch {
        if (!cancelled) {
          setPageCount(0);
          setError('Failed to read PDF. The file may be corrupted.');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

  const handleRotate = async () => {
    if (!file || pageCount === 0) return;

    setProcessing(true);
    setResult(null);
    setError(null);

    try {
      const pages = mode === 'specific' && pageRange.trim()
        ? parsePageRanges(pageRange, pageCount)
        : undefined;

      if (mode === 'specific' && pages && pages.length === 0) {
        setError('No valid pages specified.');
        setProcessing(false);
        return;
      }

      const blob = await rotatePdf(file, angle, pages);
      setResult(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while rotating.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const baseName = file ? file.name.replace(/\.pdf$/i, '') : 'document';
    download(result, `${baseName}-rotated.pdf`);
  };

  const handleClear = () => {
    setFile(null);
    setPageCount(0);
    setAngle(90);
    setMode('all');
    setPageRange('');
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
        translations={translations ? { dropFiles: common!.dropFile, supported: common!.supported } : undefined}
      />

      {file && (
        <div className="rounded-lg border border-edge bg-surface p-4 flex items-center justify-between">
          <p className="text-sm text-fg-sec">
            <span className="font-medium">{file.name}</span>
            {pageCount > 0 && (
              <span className="ml-2 text-fg-muted">
                ({pageCount} {tr?.pageCount ?? `page${pageCount !== 1 ? 's' : ''}`})
              </span>
            )}
          </p>
          <button
            onClick={handleClear}
            className="text-sm text-fg-muted hover:text-fg-sec transition-colors"
          >
            {common?.clear ?? 'Clear'}
          </button>
        </div>
      )}

      {file && pageCount > 0 && !result && (
        <>
          {/* Rotation angle */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-edge bg-surface p-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-fg-sec">
                {tr?.angle ?? 'Rotation angle'}
              </label>
              <select
                value={angle}
                onChange={(e) => setAngle(Number(e.target.value) as RotationAngle)}
                className="rounded-lg border border-edge bg-surface px-2.5 py-2.5 text-sm text-fg-sec outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
              >
                <option value={90}>{tr?.cw90 ?? '90° clockwise'}</option>
                <option value={180}>{tr?.cw180 ?? '180°'}</option>
                <option value={270}>{tr?.cw270 ?? '90° counter-clockwise'}</option>
              </select>
            </div>

            <div className="hidden h-6 w-px bg-edge sm:block" />

            {/* Mode */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-sm text-fg-sec cursor-pointer">
                <input
                  type="radio"
                  name="rotateMode"
                  checked={mode === 'all'}
                  onChange={() => setMode('all')}
                  className="accent-brand-600"
                />
                {tr?.rotateAll ?? 'Rotate all pages'}
              </label>
              <label className="flex items-center gap-1.5 text-sm text-fg-sec cursor-pointer">
                <input
                  type="radio"
                  name="rotateMode"
                  checked={mode === 'specific'}
                  onChange={() => setMode('specific')}
                  className="accent-brand-600"
                />
                {tr?.rotateSpecific ?? 'Rotate specific pages'}
              </label>
            </div>
          </div>

          {/* Page range input */}
          {mode === 'specific' && (
            <div className="space-y-1">
              <Label>
                {tr?.pageRange ?? 'Pages to rotate'}
              </Label>
              <Input
                type="text"
                value={pageRange}
                onChange={(e) => setPageRange(e.target.value)}
                placeholder={tr?.pageRangePlaceholder ?? 'e.g. 1-3, 5, 7-9'}
              />
              <p className="text-xs text-fg-muted">
                {tr?.pageRangeHelp ?? 'Separate pages with commas. Example: 1-3, 5, 7-9'}
              </p>
            </div>
          )}

          <div className="sticky bottom-4 z-40 rounded-xl bg-surface/80 p-3 backdrop-blur-sm sm:static sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            <Button
              onClick={handleRotate}
              disabled={processing}
            >
              {processing
                ? (tr?.rotating ?? 'Rotating pages...')
                : (tr?.rotateBtn ?? 'Rotate PDF')}
            </Button>
          </div>
        </>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {result && !processing && (
        <div className="animate-fade-in rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4">
          <p className="mb-3 text-sm font-medium text-green-800 dark:text-green-200">
            {tr?.success ?? 'PDF rotated successfully!'}
          </p>
          <DownloadButton
            onClick={handleDownload}
            label={`${common?.download ?? 'Download'} ${tr?.resultName ?? 'rotated.pdf'}`}
            translations={translations ? { download: `${common!.download} ${tr!.resultName}` } : undefined}
          />
        </div>
      )}
    </div>
  );
}
