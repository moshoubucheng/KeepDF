import { useState } from 'react';
import FileDropZone from '@components/shared/FileDropZone';
import ProgressBar from '@components/shared/ProgressBar';
import DownloadButton from '@components/shared/DownloadButton';
import { useDownload } from '@hooks/useDownload';
import { decryptPdf } from '@lib/pdf/decryptPdf';
import type { Translations } from '@/i18n/translations';

const ACCEPTED_TYPES = ['.pdf', 'application/pdf'];

interface DecryptPdfProps {
  translations?: {
    common: Translations['common'];
    pdfDecrypt: Translations['pdfDecrypt'];
  };
}

export default function DecryptPdf({ translations }: DecryptPdfProps) {
  const { download } = useDownload();

  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tr = translations?.pdfDecrypt;
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

  const handleDecrypt = async () => {
    if (!file || !password) return;

    setProcessing(true);
    setProgress(0);
    setResult(null);
    setError(null);

    try {
      const blob = await decryptPdf(file, password, setProgress);
      setResult(blob);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'WRONG_PASSWORD') {
        setError(tr?.wrongPassword ?? 'Incorrect password. Please try again.');
      } else {
        setError(msg);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const baseName = file ? file.name.replace(/\.pdf$/i, '') : 'document';
    download(result, `${baseName}-decrypted.pdf`);
  };

  const handleClear = () => {
    setFile(null);
    setPassword('');
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
        label="Drop a password-protected PDF here or click to browse"
        translations={translations ? { dropFiles: common!.dropFile, supported: common!.supported } : undefined}
      />

      {file && (
        <div className="rounded-lg border border-edge bg-surface p-4 flex items-center justify-between">
          <p className="text-sm text-fg-sec">
            <span className="font-medium">{file.name}</span>
            <span className="ml-2 text-fg-muted">
              ({(file.size / 1024).toFixed(1)} KB)
            </span>
          </p>
          <button onClick={handleClear} className="text-sm text-fg-muted hover:text-fg-sec transition-colors">
            {common?.clear ?? 'Clear'}
          </button>
        </div>
      )}

      {file && !result && (
        <>
          <div className="space-y-3 rounded-xl border border-edge bg-surface p-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-fg-sec">{tr?.password ?? 'PDF password'}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tr?.passwordPlaceholder ?? 'Enter the PDF password'}
                className="w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
              />
            </div>
          </div>

          <p className="text-xs text-fg-muted">
            {tr?.note ?? 'Enter the password to remove protection from the PDF.'}
          </p>

          <div className="sticky bottom-4 z-40 rounded-xl bg-surface/80 p-3 backdrop-blur-sm sm:static sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            <button
              onClick={handleDecrypt}
              disabled={processing || !password}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? (tr?.decrypting ?? 'Decrypting PDF...') : (tr?.decryptBtn ?? 'Decrypt PDF')}
            </button>
          </div>
        </>
      )}

      {processing && (
        <ProgressBar progress={progress} label={tr?.decrypting ?? 'Decrypting PDF...'} />
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {result && !processing && (
        <div className="animate-fade-in rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4">
          <p className="mb-3 text-sm font-medium text-green-800 dark:text-green-200">
            {tr?.success ?? 'PDF decrypted successfully!'}
          </p>
          <DownloadButton
            onClick={handleDownload}
            label={`${common?.download ?? 'Download'} ${tr?.resultName ?? 'decrypted.pdf'}`}
            translations={translations ? { download: `${common!.download} ${tr!.resultName}` } : undefined}
          />
        </div>
      )}
    </div>
  );
}
