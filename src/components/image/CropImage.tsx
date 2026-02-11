import { useState, useCallback, useRef } from 'react';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import FileDropZone from '@components/shared/FileDropZone';
import DownloadButton from '@components/shared/DownloadButton';
import { useDownload } from '@hooks/useDownload';
import { cropImage } from '@lib/image/crop';
import { Button } from '@/components/ui/button';
import type { Translations } from '@/i18n/translations';

const ACCEPTED = ['.png', '.jpg', '.jpeg', '.webp', 'image/png', 'image/jpeg', 'image/webp'];

const ASPECT_RATIOS: { label: string; value: number | undefined }[] = [
  { label: 'Freeform', value: undefined },
  { label: '1:1', value: 1 },
  { label: '16:9', value: 16 / 9 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
];

interface CropImageProps {
  translations?: {
    common: Translations['common'];
    imageCrop: Translations['imageCrop'];
  };
}

export default function CropImage({ translations }: CropImageProps) {
  const { download } = useDownload();
  const [file, setFile] = useState<File | null>(null);
  const [imgSrc, setImgSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);

  const createDefaultCrop = useCallback(
    (displayW: number, displayH: number, asp?: number): Crop => {
      if (asp) {
        let cw = displayW * 0.8;
        let ch = cw / asp;
        if (ch > displayH * 0.8) {
          ch = displayH * 0.8;
          cw = ch * asp;
        }
        return { unit: 'px', x: (displayW - cw) / 2, y: (displayH - ch) / 2, width: cw, height: ch };
      }
      const w = displayW * 0.8;
      const h = displayH * 0.8;
      return { unit: 'px', x: (displayW - w) / 2, y: (displayH - h) / 2, width: w, height: h };
    },
    [],
  );

  const handleFiles = useCallback((files: FileList | File[]) => {
    const f = Array.from(files)[0];
    if (!f) return;
    setFile(f);
    setCrop(undefined);
    setCompletedCrop(undefined);
    const reader = new FileReader();
    reader.onload = () => setImgSrc(reader.result as string);
    reader.readAsDataURL(f);
  }, []);

  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setImgSize({ w: width, h: height });
      const c = createDefaultCrop(width, height, aspect);
      setCrop(c);
      setCompletedCrop(c);
    },
    [aspect, createDefaultCrop],
  );

  const handleCrop = useCallback(async () => {
    if (!file || !completedCrop || !imgRef.current) return;

    const img = imgRef.current;
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    const pixelCrop = {
      x: Math.round(completedCrop.x * scaleX),
      y: Math.round(completedCrop.y * scaleY),
      width: Math.round(completedCrop.width * scaleX),
      height: Math.round(completedCrop.height * scaleY),
    };

    if (pixelCrop.width <= 0 || pixelCrop.height <= 0) return;

    setIsProcessing(true);
    try {
      const blob = await cropImage(file, pixelCrop);
      const ext = file.name.split('.').pop() || 'png';
      const baseName = file.name.slice(0, file.name.lastIndexOf('.'));
      const filename = `${baseName}-cropped.${ext}`;
      download(blob, filename);
    } catch {
      // silently fail
    } finally {
      setIsProcessing(false);
    }
  }, [file, completedCrop, download]);

  const handleClear = useCallback(() => {
    setFile(null);
    setImgSrc('');
    setCrop(undefined);
    setCompletedCrop(undefined);
    setImgSize(null);
  }, []);

  const ratioLabels = ASPECT_RATIOS.map((r) => ({
    ...r,
    label: r.value === undefined ? (translations?.imageCrop.freeform ?? r.label) : r.label,
  }));

  return (
    <div className="space-y-6">
      {!file && (
        <FileDropZone
          onFiles={handleFiles}
          accept={ACCEPTED}
          multiple={false}
          label="Drop an image here or click to browse"
          translations={translations ? { dropFiles: translations.common.dropFile, supported: translations.common.supported } : undefined}
        />
      )}

      {file && imgSrc && (
        <>
          {/* Aspect ratio selector */}
          <div className="rounded-lg border border-edge bg-surface p-4">
            <label className="mb-2 block text-sm font-medium text-fg-sec">
              {translations?.imageCrop.ratio ?? 'Aspect ratio'}
            </label>
            <div className="flex flex-wrap gap-2">
              {ratioLabels.map((r) => (
                <button
                  key={r.label}
                  onClick={() => {
                    setAspect(r.value);
                    if (imgSize) {
                      const c = createDefaultCrop(imgSize.w, imgSize.h, r.value);
                      setCrop(c);
                      setCompletedCrop(c);
                    }
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    aspect === r.value
                      ? 'bg-brand-600 text-white'
                      : 'bg-inset text-fg-sec hover:bg-hover-strong'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Crop area */}
          <div className="rounded-lg border border-edge bg-surface p-4">
            <p className="mb-3 text-sm text-fg-muted">
              {translations?.imageCrop.instruction ?? 'Drag to select the crop area'}
            </p>
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
            >
              <img
                ref={imgRef}
                src={imgSrc}
                alt="Crop preview"
                className="max-h-[500px] max-w-full"
                onLoad={handleImageLoad}
              />
            </ReactCrop>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 sticky bottom-4 z-40 rounded-xl bg-surface/80 p-3 backdrop-blur-sm sm:static sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            <Button
              onClick={handleCrop}
              disabled={isProcessing || !completedCrop || completedCrop.width <= 0 || completedCrop.height <= 0}
            >
              {isProcessing
                ? (translations?.imageCrop.cropping ?? 'Cropping...')
                : (translations?.imageCrop.cropBtn ?? 'Crop Image')}
            </Button>

            <Button variant="ghost"
              onClick={handleClear}
            >
              {translations?.common.clear ?? 'Clear'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
