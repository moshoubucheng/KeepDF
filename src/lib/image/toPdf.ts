/**
 * Convert multiple image files into a single PDF document using jsPDF.
 * Each image is placed on its own page.
 */

export interface ImageToPdfOptions {
  pageSize: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
  fitMode: 'fit' | 'fill';
  onProgress?: (progress: number) => void;
}

/** Page dimensions in mm */
const PAGE_SIZES: Record<string, { w: number; h: number }> = {
  a4: { w: 210, h: 297 },
  letter: { w: 215.9, h: 279.4 },
};

const MARGIN = 10; // mm

async function getImageDataUrl(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  // Use PNG for lossless; jsPDF will handle compression
  const dataUrl = canvas.toDataURL('image/png');
  return { dataUrl, width, height };
}

export async function imagesToPdf(
  files: File[],
  options: ImageToPdfOptions,
): Promise<Blob> {
  const { pageSize, orientation, fitMode, onProgress } = options;

  const { jsPDF } = await import('jspdf');

  const pageDim = PAGE_SIZES[pageSize] ?? PAGE_SIZES.a4;
  const pageW = orientation === 'landscape' ? pageDim.h : pageDim.w;
  const pageH = orientation === 'landscape' ? pageDim.w : pageDim.h;

  const doc = new jsPDF({
    orientation: orientation === 'landscape' ? 'landscape' : 'portrait',
    unit: 'mm',
    format: pageSize,
  });

  for (let i = 0; i < files.length; i++) {
    if (i > 0) {
      doc.addPage(pageSize, orientation === 'landscape' ? 'landscape' : 'portrait');
    }

    const { dataUrl, width: imgW, height: imgH } = await getImageDataUrl(files[i]);

    const availW = pageW - MARGIN * 2;
    const availH = pageH - MARGIN * 2;

    let drawW: number;
    let drawH: number;
    let drawX: number;
    let drawY: number;

    if (fitMode === 'fit') {
      // Scale to fit within available area, maintaining aspect ratio
      const scaleW = availW / imgW;
      const scaleH = availH / imgH;
      const scale = Math.min(scaleW, scaleH);
      drawW = imgW * scale;
      drawH = imgH * scale;
      // Center on page
      drawX = MARGIN + (availW - drawW) / 2;
      drawY = MARGIN + (availH - drawH) / 2;
    } else {
      // Fill: scale to cover the full page (may crop edges)
      const scaleW = pageW / imgW;
      const scaleH = pageH / imgH;
      const scale = Math.max(scaleW, scaleH);
      drawW = imgW * scale;
      drawH = imgH * scale;
      // Center (overflow will be clipped by page bounds)
      drawX = (pageW - drawW) / 2;
      drawY = (pageH - drawH) / 2;
    }

    doc.addImage(dataUrl, 'PNG', drawX, drawY, drawW, drawH);

    onProgress?.(Math.round(((i + 1) / files.length) * 100));
  }

  return doc.output('blob');
}
