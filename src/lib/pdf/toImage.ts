import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.624/build/pdf.worker.min.mjs';

export interface PdfToImageOptions {
  format: 'png' | 'jpeg';
  scale: number;
}

export async function getPageCount(file: File): Promise<number> {
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const count = doc.numPages;
  doc.destroy();
  return count;
}

export async function pdfToImages(
  file: File,
  options: PdfToImageOptions,
  onProgress?: (p: number) => void,
): Promise<Blob[]> {
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const blobs: Blob[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: options.scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const mimeType = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Canvas conversion failed'))),
        mimeType,
        0.95,
      );
    });

    blobs.push(blob);
    onProgress?.(Math.round((i / doc.numPages) * 100));
  }

  doc.destroy();
  return blobs;
}
