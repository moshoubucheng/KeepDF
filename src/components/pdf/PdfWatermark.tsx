import { useState } from 'react';
import FileDropZone from '@components/shared/FileDropZone';
import ProgressBar from '@components/shared/ProgressBar';
import DownloadButton from '@components/shared/DownloadButton';
import { useDownload } from '@hooks/useDownload';
import { addWatermark } from '@lib/pdf/watermark';
import type { WatermarkOptions } from '@lib/pdf/watermark';
import type { Translations } from '@/i18n/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ACCEPTED_TYPES = ['.pdf', 'application/pdf'];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
  };
}

interface PdfWatermarkProps {
  translations?: {
    common: Translations['common'];
    pdfWatermark: Translations['pdfWatermark'];
  };
}

export default function PdfWatermark({ translations }: PdfWatermarkProps) {
  const { download } = useDownload();

  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(0.3);
  const [rotation, setRotation] = useState(-45);
  const [colorHex, setColorHex] = useState('#999999');
  const [position, setPosition] = useState<WatermarkOptions['position']>('diagonal');
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<Uint8Array | null>(null);
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

  const handleApply = async () => {
    if (!file || !text.trim()) return;

    setProcessing(true);
    setProgress(0);
    setResult(null);
    setError(null);

    try {
      const options: WatermarkOptions = {
        text: text.trim(),
        fontSize,
        opacity,
        rotation,
        color: hexToRgb(colorHex),
        position,
      };
      const output = await addWatermark(file, options, setProgress);
      setResult(output);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while applying watermark.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'application/pdf' });
    download(blob, translations?.pdfWatermark.resultName ?? 'watermarked.pdf');
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
          </p>
        </div>
      )}

      {file && (
        <>
          <div className="rounded-lg border border-edge bg-surface p-4 space-y-4">
            {/* Watermark text */}
            <div>
              <Label htmlFor="wm-text" className="mb-1 block">
                {translations?.pdfWatermark.text ?? 'Watermark text'}
              </Label>
              <Input
                id="wm-text"
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={translations?.pdfWatermark.textPlaceholder ?? 'Enter watermark text'}
              />
            </div>

            {/* Font size slider */}
            <div>
              <Label className="mb-2 flex items-center justify-between">
                <span>{translations?.pdfWatermark.fontSize ?? 'Font size'}</span>
                <span className="tabular-nums text-brand-600">{fontSize}px</span>
              </Label>
              <input
                type="range"
                min={12}
                max={120}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
              <div className="mt-1 flex justify-between text-xs text-fg-faint">
                <span>12px</span>
                <span>120px</span>
              </div>
            </div>

            {/* Opacity slider */}
            <div>
              <Label className="mb-2 flex items-center justify-between">
                <span>{translations?.pdfWatermark.opacity ?? 'Opacity'}</span>
                <span className="tabular-nums text-brand-600">{Math.round(opacity * 100)}%</span>
              </Label>
              <input
                type="range"
                min={5}
                max={100}
                value={Math.round(opacity * 100)}
                onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                className="w-full accent-brand-600"
              />
              <div className="mt-1 flex justify-between text-xs text-fg-faint">
                <span>5%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Position select */}
            <div>
              <Label htmlFor="wm-position" className="mb-1 block">
                {translations?.pdfWatermark.position ?? 'Position'}
              </Label>
              <select
                id="wm-position"
                value={position}
                onChange={(e) => {
                  const pos = e.target.value as WatermarkOptions['position'];
                  setPosition(pos);
                  if (pos === 'diagonal') setRotation(-45);
                  else setRotation(0);
                }}
                className="w-full rounded-lg border border-edge-input px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="center">{translations?.pdfWatermark.center ?? 'Center'}</option>
                <option value="diagonal">{translations?.pdfWatermark.diagonal ?? 'Diagonal'}</option>
              </select>
            </div>

            {/* Rotation input */}
            <div>
              <Label className="mb-2 flex items-center justify-between">
                <span>{translations?.pdfWatermark.rotation ?? 'Rotation'}</span>
                <span className="tabular-nums text-brand-600">{rotation}&deg;</span>
              </Label>
              <input
                type="range"
                min={-180}
                max={180}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
              <div className="mt-1 flex justify-between text-xs text-fg-faint">
                <span>-180&deg;</span>
                <span>180&deg;</span>
              </div>
            </div>

            {/* Color picker */}
            <div>
              <Label htmlFor="wm-color" className="mb-1 block">
                {translations?.pdfWatermark.color ?? 'Color'}
              </Label>
              <input
                id="wm-color"
                type="color"
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                className="h-10 w-20 cursor-pointer rounded border border-edge-input"
              />
            </div>
          </div>

          <div className="sticky bottom-4 z-40 rounded-xl bg-surface/80 p-3 backdrop-blur-sm sm:static sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <Button
            onClick={handleApply}
            disabled={processing || !text.trim()}
          >
            {processing
              ? (translations?.pdfWatermark.applying ?? 'Applying...')
              : (translations?.pdfWatermark.applyBtn ?? 'Apply Watermark')}
          </Button>
          </div>
        </>
      )}

      {processing && (
        <ProgressBar progress={progress} label={translations?.pdfWatermark.applying ?? 'Applying watermark...'} />
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {result && !processing && (
        <div className="animate-fade-in rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4">
          <p className="mb-3 text-sm font-medium text-green-800 dark:text-green-200">
            {translations?.pdfWatermark.success ?? 'Watermark applied successfully!'}
          </p>
          <DownloadButton
            onClick={handleDownload}
            label={`${translations?.common.download ?? 'Download'} ${translations?.pdfWatermark.resultName ?? 'watermarked.pdf'}`}
            translations={translations ? { download: `${translations.common.download} ${translations.pdfWatermark.resultName}` } : undefined}
          />
        </div>
      )}
    </div>
  );
}
