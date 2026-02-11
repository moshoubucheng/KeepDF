import { useState, useEffect } from 'react';
import FileDropZone from '@components/shared/FileDropZone';
import ProgressBar from '@components/shared/ProgressBar';
import DownloadButton from '@components/shared/DownloadButton';
import { useDownload } from '@hooks/useDownload';
import { encryptPdf } from '@lib/pdf/encryptPdf';
import type { Translations } from '@/i18n/translations';
import { PDFDocument } from 'pdf-lib';

const ACCEPTED_TYPES = ['.pdf', 'application/pdf'];

interface EncryptPdfProps {
  translations?: {
    common: Translations['common'];
    pdfEncrypt: Translations['pdfEncrypt'];
  };
}

export default function EncryptPdf({ translations }: EncryptPdfProps) {
  const { download } = useDownload();

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tr = translations?.pdfEncrypt;
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
    if (!file) { setPageCount(0); return; }
    let cancelled = false;
    (async () => {
      try {
        const data = new Uint8Array(await file.arrayBuffer());
        const doc = await PDFDocument.load(data);
        if (!cancelled) setPageCount(doc.getPageCount());
      } catch {
        if (!cancelled) { setPageCount(0); setError('Failed to read PDF.'); }
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

  const handleEncrypt = async () => {
    if (!file || pageCount === 0) return;
    if (!password) {
      setError(tr?.minLength ?? 'Password must be at least 1 character.');
      return;
    }
    if (password !== confirmPassword) {
      setError(tr?.mismatch ?? 'Passwords do not match.');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setResult(null);
    setError(null);

    try {
      const blob = await encryptPdf(file, password, setProgress);
      setResult(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const baseName = file ? file.name.replace(/\.pdf$/i, '') : 'document';
    download(result, `${baseName}-encrypted.pdf`);
  };

  const handleClear = () => {
    setFile(null);
    setPageCount(0);
    setPassword('');
    setConfirmPassword('');
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
          <button onClick={handleClear} className="text-sm text-fg-muted hover:text-fg-sec transition-colors">
            {common?.clear ?? 'Clear'}
          </button>
        </div>
      )}

      {file && pageCount > 0 && !result && (
        <>
          <div className="space-y-3 rounded-xl border border-edge bg-surface p-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-fg-sec">{tr?.password ?? 'Password'}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tr?.passwordPlaceholder ?? 'Enter password'}
                className="w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-fg-sec">{tr?.confirmPassword ?? 'Confirm password'}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={tr?.confirmPlaceholder ?? 'Re-enter password'}
                className="w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
              />
            </div>
          </div>

          <p className="text-xs text-fg-muted">
            {tr?.note ?? 'The PDF will be rendered as images and saved with password protection. Text will not be selectable in the output.'}
          </p>

          <div className="sticky bottom-4 z-40 rounded-xl bg-surface/80 p-3 backdrop-blur-sm sm:static sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            <button
              onClick={handleEncrypt}
              disabled={processing || !password || !confirmPassword}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? (tr?.encrypting ?? 'Encrypting PDF...') : (tr?.encryptBtn ?? 'Encrypt PDF')}
            </button>
          </div>
        </>
      )}

      {processing && (
        <ProgressBar progress={progress} label={tr?.encrypting ?? 'Encrypting PDF...'} />
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {result && !processing && (
        <div className="animate-fade-in rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4">
          <p className="mb-3 text-sm font-medium text-green-800 dark:text-green-200">
            {tr?.success ?? 'PDF encrypted successfully!'}
          </p>
          <DownloadButton
            onClick={handleDownload}
            label={`${common?.download ?? 'Download'} ${tr?.resultName ?? 'encrypted.pdf'}`}
            translations={translations ? { download: `${common!.download} ${tr!.resultName}` } : undefined}
          />
        </div>
      )}
    </div>
  );
}
